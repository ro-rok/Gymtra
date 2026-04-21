from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.audit import log_audit_event
from app.core.security import hash_password
from app.core.serializers import as_str_id
from app.modules.member_profiles.repository import MemberProfilesRepository
from app.modules.member_profiles.schemas import (
    MemberCreateRequest,
    MemberDashboardSummaryResponse,
    MemberDetailResponse,
    MemberListResponse,
    MemberSelfUpdateRequest,
    MemberSummaryResponse,
    MemberUpdateRequest,
    MembershipSnapshot,
)


class MemberProfilesService:
    def __init__(self, db: Database):
        self.db = db
        self.repo = MemberProfilesRepository(db)

    def _resolve_gym_id(self, actor: dict) -> ObjectId:
        gym_id = actor.get("gym_id")
        if not gym_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gym context is required")
        return gym_id

    def _to_profile_payload(self, payload: dict) -> dict:
        return {
            "age": payload.get("age"),
            "gender": payload.get("gender"),
            "height_cm": payload.get("heightCm"),
            "current_weight_kg": payload.get("currentWeightKg"),
            "goal_weight_kg": payload.get("goalWeightKg"),
            "activity_level": payload.get("activityLevel"),
            "allergies": payload.get("allergies"),
            "food_preference": payload.get("foodPreference"),
            "medical_conditions": payload.get("medicalConditions"),
            "meal_timings": payload.get("mealTimings"),
            "body_fat_pct": payload.get("bodyFatPct"),
            "measurements": payload.get("measurements"),
        }

    def _membership_snapshot(self, row: dict | None) -> MembershipSnapshot | None:
        if not row:
            return None
        return MembershipSnapshot(
            id=as_str_id(row.get("_id")) or "",
            plan=row.get("plan", ""),
            amount=float(row.get("amount", 0)),
            startDate=row.get("start_date", "").strftime("%Y-%m-%d"),
            endDate=row.get("end_date", "").strftime("%Y-%m-%d"),
            status=row.get("status", "active"),
        )

    def _to_member_summary(self, user: dict, profile: dict | None) -> MemberSummaryResponse:
        return MemberSummaryResponse(
            id=as_str_id(user.get("_id")) or "",
            gymId=as_str_id(user.get("gym_id")) or "",
            name=user.get("name", ""),
            email=user.get("email", ""),
            phone=user.get("phone"),
            joinDate=(user.get("join_date") or datetime.now(timezone.utc)).strftime("%Y-%m-%d"),
            status=user.get("status", "active"),
            avatar=user.get("avatar"),
            age=profile.get("age") if profile else None,
            gender=profile.get("gender") if profile else None,
            activityLevel=profile.get("activity_level") if profile else None,
            foodPreference=profile.get("food_preference") if profile else None,
        )

    def create_member(self, actor: dict, payload: MemberCreateRequest) -> MemberDetailResponse:
        gym_id = self._resolve_gym_id(actor)
        if self.repo.get_member_by_email(payload.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
        user = self.repo.create_member_user(
            {
                "name": payload.name,
                "email": payload.email.lower().strip(),
                "phone": payload.phone,
                "password_hash": hash_password(payload.password),
                "gym_id": gym_id,
                "join_date": datetime.combine(payload.joinDate, datetime.min.time(), tzinfo=timezone.utc),
                "avatar": "".join([part[0] for part in payload.name.split(" ")[:2]]).upper(),
            }
        )
        profile = self.repo.upsert_profile(ObjectId(user["_id"]), gym_id, self._to_profile_payload(payload.model_dump()))
        log_audit_event(
            self.db,
            action="members.create",
            actor_user_id=as_str_id(actor.get("_id")),
            target_type="user",
            target_id=as_str_id(user.get("_id")),
        )
        return self.get_member_detail(actor, as_str_id(user.get("_id")) or "")

    def update_member(self, actor: dict, member_id: str, payload: MemberUpdateRequest) -> MemberDetailResponse:
        gym_id = self._resolve_gym_id(actor)
        if not ObjectId.is_valid(member_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        member_oid = ObjectId(member_id)
        member = self.repo.get_member_user(member_oid, gym_id)
        if not member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

        update_payload: dict = {}
        for key, value in payload.model_dump(exclude_none=True).items():
            if key in {"name", "phone", "status"}:
                update_payload[key] = value
            if key == "email":
                update_payload["email"] = value.lower().strip()
            if key == "joinDate":
                update_payload["join_date"] = datetime.combine(value, datetime.min.time(), tzinfo=timezone.utc)
        if update_payload:
            self.repo.update_member_user(member_oid, gym_id, update_payload)

        profile_data = self._to_profile_payload(payload.model_dump(exclude_none=True))
        if any(v is not None for v in profile_data.values()):
            self.repo.upsert_profile(member_oid, gym_id, profile_data)

        log_audit_event(
            self.db,
            action="members.update",
            actor_user_id=as_str_id(actor.get("_id")),
            target_type="user",
            target_id=member_id,
        )
        return self.get_member_detail(actor, member_id)

    def update_own_profile(self, actor: dict, payload: MemberSelfUpdateRequest) -> MemberDetailResponse:
        gym_id = self._resolve_gym_id(actor)
        self.repo.upsert_profile(ObjectId(actor["_id"]), gym_id, self._to_profile_payload(payload.model_dump(exclude_none=True)))
        log_audit_event(self.db, action="members.self_update", actor_user_id=as_str_id(actor.get("_id")))
        return self.get_member_detail(actor, as_str_id(actor.get("_id")) or "")

    def get_member_detail(self, actor: dict, member_id: str) -> MemberDetailResponse:
        gym_id = self._resolve_gym_id(actor)
        if not ObjectId.is_valid(member_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        member_oid = ObjectId(member_id)
        user = self.repo.get_member_user(member_oid, gym_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        profile = self.repo.get_profile(member_oid, gym_id)
        membership = self.repo.get_latest_membership(member_oid, gym_id)
        summary = self._to_member_summary(user, profile)
        return MemberDetailResponse(
            **summary.model_dump(),
            heightCm=profile.get("height_cm") if profile else None,
            currentWeightKg=profile.get("current_weight_kg") if profile else None,
            goalWeightKg=profile.get("goal_weight_kg") if profile else None,
            allergies=profile.get("allergies") if profile else None,
            medicalConditions=profile.get("medical_conditions") if profile else None,
            mealTimings=profile.get("meal_timings") if profile else None,
            bodyFatPct=profile.get("body_fat_pct") if profile else None,
            measurements=profile.get("measurements") if profile else None,
            membership=self._membership_snapshot(membership),
        )

    def list_members(self, actor: dict, q: str | None, status_filter: str | None) -> MemberListResponse:
        gym_id = self._resolve_gym_id(actor)
        users = self.repo.list_members(gym_id, q, status_filter)
        ids = [u["_id"] for u in users]
        profiles = self.repo.get_profiles_by_member_ids(gym_id, ids) if ids else {}
        items = [self._to_member_summary(user, profiles.get(str(user["_id"]))) for user in users]
        return MemberListResponse(items=items, total=len(items))

    def dashboard_summary(self, actor: dict) -> MemberDashboardSummaryResponse:
        gym_id = self._resolve_gym_id(actor)
        users = self.repo.list_members(gym_id, None, None)
        memberships = self.repo.get_latest_memberships_by_member_ids(gym_id, [u["_id"] for u in users])
        now = datetime.now(timezone.utc)
        expiring_cutoff = now + timedelta(days=14)
        expired = 0
        pending = 0
        expiring_soon = 0
        for user in users:
            ms = memberships.get(str(user["_id"]))
            if not ms:
                continue
            end_date = ms.get("end_date")
            if end_date and end_date < now:
                expired += 1
            elif end_date and end_date <= expiring_cutoff:
                pending += 1
                expiring_soon += 1
        return MemberDashboardSummaryResponse(
            total=len(users),
            active=len([u for u in users if u.get("status") == "active"]),
            expired=expired,
            pendingRenewal=pending,
            expiringSoon=expiring_soon,
            unpaid=0,
        )
