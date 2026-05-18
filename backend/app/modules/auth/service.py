from datetime import datetime, timedelta, timezone
import logging
from secrets import choice

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.audit import log_audit_event
from app.core.config import get_settings
from app.core.mailer import send_email_async
from app.core.security import generate_refresh_token, hash_password, hash_refresh_token, verify_password
from app.core.serializers import as_str_id
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import AuthUserResponse, OwnerPasswordResetRequestItem, PasswordResetRequestItem
from app.modules.notifications.service import NotificationsService
from app.modules.public.repository import PublicRepository


class AuthService:
    def __init__(self, db: Database):
        self.db = db
        self.repo = AuthRepository(db)
        self.public_repo = PublicRepository(db)
        self.logger = logging.getLogger(__name__)

    def _validate_active_user(self, user: dict | None, password: str) -> dict:
        if not user or not verify_password(password, user["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        if user.get("status") != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")
        return user

    def login(self, *, email: str, password: str, gym_slug: str | None):
        if gym_slug:
            gym = self.public_repo.get_gym_by_slug(gym_slug)
            if not gym:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gym not found")
            user = self.repo.get_user_by_email(email, gym_id=gym["_id"])
            user = self._validate_active_user(user, password)
            if user.get("role") == "super_admin":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Super admin login is global")
            return user

        user = self.repo.get_user_by_email(email, role="super_admin")
        user = self._validate_active_user(user, password)
        if user.get("role") != "super_admin":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gym slug is required")
        return user

    def login_phone(self, *, phone: str, password: str, gym_slug: str | None):
        normalized_phone = phone.strip()
        if gym_slug:
            gym = self.public_repo.get_gym_by_slug(gym_slug)
            if not gym:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gym not found")
            user = self.repo.get_user_by_phone(normalized_phone, gym_id=gym["_id"])
            user = self._validate_active_user(user, password)
            if user.get("role") == "super_admin":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Super admin login is global")
            return user

        user = self.repo.get_user_by_phone(normalized_phone, role="super_admin")
        user = self._validate_active_user(user, password)
        if user.get("role") != "super_admin":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gym slug is required")
        return user

    @staticmethod
    def build_default_password(*, gym_name: str, for_date: datetime) -> str:
        gym_token = "".join(ch for ch in gym_name if ch.isalnum()) or "Gym"
        date_part = for_date.strftime("%d%m%y")
        return f"{gym_token}@{date_part}"

    def create_refresh_session(self, *, user: dict, user_agent: str | None = None) -> str:
        now = datetime.now(timezone.utc)
        refresh_token = generate_refresh_token()
        self.repo.create_refresh_token(
            {
                "token_hash": hash_refresh_token(refresh_token),
                "user_id": user["_id"],
                "gym_id": user.get("gym_id"),
                "expires_at": now + timedelta(days=get_settings().refresh_token_expire_days),
                "created_at": now,
                "user_agent": user_agent,
                "status": "active",
            }
        )
        return refresh_token

    @staticmethod
    def _as_utc(dt: datetime | None) -> datetime | None:
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    def rotate_refresh_session(self, *, refresh_token: str, user_agent: str | None = None) -> tuple[dict, str]:
        token_hash = hash_refresh_token(refresh_token)
        token_doc = self.repo.get_refresh_token(token_hash)
        now = datetime.now(timezone.utc)
        if not token_doc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        if token_doc.get("status") == "revoked":
            user_id = token_doc.get("user_id")
            self.repo.mark_refresh_reuse_event(token_hash=token_hash, user_id=user_id)
            if isinstance(user_id, ObjectId):
                self.repo.revoke_all_refresh_tokens_for_user(user_id, reason="reuse_detected")
                log_audit_event(
                    self.db,
                    action="auth.refresh_reuse_detected",
                    actor_user_id=str(user_id),
                    metadata={"token_hash": token_hash[:12]},
                )
                self.logger.warning(
                    "auth.refresh.reuse_detected",
                    extra={"event": "auth.refresh.reuse_detected", "user_id": str(user_id)},
                )
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        expires_at = self._as_utc(token_doc.get("expires_at"))
        if not expires_at or expires_at < now:
            self.repo.revoke_refresh_token(token_hash, reason="expired")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        user_id = token_doc.get("user_id")
        gym_id = token_doc.get("gym_id")
        if not user_id:
            self.repo.revoke_refresh_token(token_doc.get("token_hash", ""), reason="invalid_payload")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        user = self.repo.get_user_by_id(str(user_id), gym_id=gym_id if gym_id else None)
        if not user or user.get("status") != "active":
            self.repo.revoke_refresh_token(token_doc["token_hash"], reason="user_inactive")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        self.repo.revoke_refresh_token(token_doc["token_hash"], reason="rotated")
        new_refresh = self.create_refresh_session(user=user, user_agent=user_agent)
        return user, new_refresh

    def revoke_refresh_session(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        self.repo.revoke_refresh_token(hash_refresh_token(refresh_token), reason="logout")

    def revoke_all_refresh_sessions(self, user: dict) -> None:
        user_id = user.get("_id")
        if isinstance(user_id, ObjectId):
            self.repo.revoke_all_refresh_tokens_for_user(user_id, reason="logout_all")

    def to_auth_user(self, user_doc) -> AuthUserResponse:
        gym_slug = None
        gym_id = as_str_id(user_doc.get("gym_id"))
        if gym_id:
            gym = self.db.gyms.find_one({"_id": user_doc["gym_id"]})
            gym_slug = gym.get("slug") if gym else None
        return AuthUserResponse(
            id=as_str_id(user_doc.get("_id")) or "",
            email=user_doc["email"],
            name=user_doc.get("name", ""),
            role=user_doc["role"],
            gymId=gym_id,
            gymSlug=gym_slug,
            avatar=user_doc.get("avatar"),
            mustChangePassword=bool(user_doc.get("must_change_password", False)),
        )

    def change_password_required(self, *, actor: dict, new_password: str) -> None:
        user_id = actor.get("_id")
        if not isinstance(user_id, ObjectId):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user")
        self.repo.update_user_password(user_id=user_id, password_hash=hash_password(new_password), must_change_password=False)

    def create_password_reset_request(self, *, gym_slug: str, identifier: str) -> dict:
        gym = self.public_repo.get_gym_by_slug(gym_slug)
        if not gym:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gym not found")
        member = self.repo.get_user_by_email(identifier, gym_id=gym["_id"]) or self.repo.get_user_by_phone(identifier, gym_id=gym["_id"])
        if not member or member.get("role") != "member":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        now = datetime.now(timezone.utc)
        request_doc = self.repo.create_password_reset_request(
            {
                "gym_id": gym["_id"],
                "member_id": member["_id"],
                "status": "pending",
                "created_at": now,
                "updated_at": now,
            }
        )
        owner = self.db.users.find_one({"gym_id": gym["_id"], "role": "owner"})
        if owner:
            NotificationsService(self.db).send_event_async(
                event_type="password_reset_request",
                title="Password reset request",
                body=f"{member.get('name', 'A member')} requested a password reset.",
                gym_id=as_str_id(gym["_id"]) or "",
                user_id=as_str_id(owner.get("_id")),
            )
        owner_email = owner.get("email") if owner else None
        member_name = member.get("name", "Member")
        send_email_async(
            to_email=member.get("email"),
            subject="Gymtra password reset request created",
            body=f"Hi {member_name}, your password reset request has been created and is pending owner approval.",
        )
        send_email_async(
            to_email=owner_email,
            subject="Gymtra member password reset request",
            body=f"Member {member_name} requested a password reset. Approve it from dashboard reminders.",
        )
        return {"success": True, "requestId": as_str_id(request_doc.get("_id"))}

    def create_owner_password_reset_request(self, *, gym_slug: str, email: str) -> dict:
        gym = self.public_repo.get_gym_by_slug(gym_slug)
        # Always return success to avoid account enumeration.
        if not gym:
            return {"success": True}
        owner = self.repo.get_user_by_email(email=email, gym_id=gym["_id"], role="owner")
        if not owner:
            return {"success": True}
        owner_id = owner.get("_id")
        if not isinstance(owner_id, ObjectId):
            return {"success": True}

        now = datetime.now(timezone.utc)
        existing = self.repo.get_pending_owner_password_reset_request(owner_id=owner_id, gym_id=gym["_id"])
        if existing:
            return {"success": True}
        self.repo.create_owner_password_reset_request(
            {
                "owner_id": owner_id,
                "gym_id": gym["_id"],
                "status": "pending",
                "created_at": now,
                "updated_at": now,
            }
        )
        return {"success": True}

    def list_pending_owner_password_reset_requests(self) -> list[OwnerPasswordResetRequestItem]:
        rows = self.repo.list_owner_password_reset_requests(status="pending")
        items: list[OwnerPasswordResetRequestItem] = []
        for row in rows:
            owner = self.db.users.find_one({"_id": row.get("owner_id"), "role": "owner"}) or {}
            gym = self.db.gyms.find_one({"_id": row.get("gym_id")}) or {}
            items.append(
                OwnerPasswordResetRequestItem(
                    id=as_str_id(row.get("_id")) or "",
                    gymId=as_str_id(row.get("gym_id")) or "",
                    gymSlug=gym.get("slug", ""),
                    gymName=gym.get("name", ""),
                    ownerId=as_str_id(row.get("owner_id")) or "",
                    ownerName=owner.get("name", "Owner"),
                    ownerEmail=owner.get("email", ""),
                    status=row.get("status", "pending"),
                    createdAt=(row.get("created_at") or datetime.now(timezone.utc)).isoformat(),
                )
            )
        return items

    def approve_owner_password_reset_request(self, *, actor: dict, request_id: str) -> dict:
        if not ObjectId.is_valid(request_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
        req = self.repo.get_owner_password_reset_request_by_id(ObjectId(request_id))
        if not req or req.get("status") != "pending":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

        owner_id = req.get("owner_id")
        gym_id = req.get("gym_id")
        if not isinstance(owner_id, ObjectId):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request payload")
        owner = self.db.users.find_one({"_id": owner_id, "gym_id": gym_id, "role": "owner"})
        if not owner:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found")

        chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
        temp_password = "".join(choice(chars) for _ in range(12))
        now = datetime.now(timezone.utc)
        self.repo.update_user_password(user_id=owner_id, password_hash=hash_password(temp_password), must_change_password=True)
        self.repo.revoke_all_refresh_tokens_for_user(owner_id, reason="owner_temp_password_reset")
        self.repo.update_owner_password_reset_request(
            request_id=ObjectId(request_id),
            payload={
                "status": "approved",
                "approved_at": now,
                "approved_by": actor.get("_id"),
                "updated_at": now,
            },
        )
        return {
            "success": True,
            "ownerEmail": owner.get("email", ""),
            "temporaryPassword": temp_password,
        }

    def list_pending_password_reset_requests(self, *, actor: dict) -> list[PasswordResetRequestItem]:
        gym_id = actor.get("gym_id")
        if not gym_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gym context is required")
        rows = self.repo.list_password_reset_requests(gym_id=gym_id, status="pending")
        items: list[PasswordResetRequestItem] = []
        for row in rows:
            member = self.db.users.find_one({"_id": row.get("member_id")})
            items.append(
                PasswordResetRequestItem(
                    id=as_str_id(row.get("_id")) or "",
                    memberId=as_str_id(row.get("member_id")) or "",
                    memberName=(member or {}).get("name", "Member"),
                    memberEmail=(member or {}).get("email"),
                    memberPhone=(member or {}).get("phone"),
                    createdAt=(row.get("created_at") or datetime.now(timezone.utc)).isoformat(),
                    status=row.get("status", "pending"),
                )
            )
        return items

    def approve_password_reset_request(self, *, actor: dict, request_id: str) -> None:
        if not ObjectId.is_valid(request_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
        req = self.repo.get_password_reset_request(ObjectId(request_id))
        if not req or req.get("status") != "pending":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
        gym_id = actor.get("gym_id")
        if not gym_id or req.get("gym_id") != gym_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        member_id = req.get("member_id")
        member = self.db.users.find_one({"_id": member_id, "gym_id": gym_id, "role": "member"})
        gym = self.db.gyms.find_one({"_id": gym_id})
        if not member or not gym:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        now = datetime.now(timezone.utc)
        default_password = self.build_default_password(gym_name=gym.get("name", "Gym"), for_date=now)
        self.repo.update_user_password(user_id=member["_id"], password_hash=hash_password(default_password), must_change_password=True)
        self.repo.update_password_reset_request(
            request_id=ObjectId(request_id),
            payload={
                "status": "approved",
                "approved_at": now,
                "approved_by": actor.get("_id"),
                "updated_at": now,
            },
        )
        send_email_async(
            to_email=member.get("email"),
            subject="Gymtra password reset approved",
            body=(
                f"Hi {member.get('name', 'Member')}, your password reset was approved.\n"
                f"Temporary password: {default_password}\n"
                "You must change your password after login."
            ),
        )

