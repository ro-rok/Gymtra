from datetime import datetime, timedelta, timezone
import logging

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.audit import log_audit_event
from app.core.config import get_settings
from app.core.security import generate_refresh_token, hash_refresh_token, verify_password
from app.core.serializers import as_str_id
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import AuthUserResponse
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
        )

