from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.audit import log_audit_event
from app.core.security import hash_password
from app.core.serializers import as_str_id
from app.modules.staff.repository import StaffRepository
from app.modules.staff.schemas import StaffCreatePayload, StaffListResponse, StaffRecord


class StaffService:
    def __init__(self, db: Database):
        self.db = db
        self.repo = StaffRepository(db)

    @staticmethod
    def _resolve_actor_gym(actor: dict) -> ObjectId:
        gym_id = actor.get("gym_id")
        if not gym_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gym context is required")
        return gym_id

    def list_staff(self, actor: dict) -> StaffListResponse:
        gym_id = self._resolve_actor_gym(actor)
        users = self.repo.list_staff_users(gym_id)
        user_ids = [row["_id"] for row in users]
        profiles = self.repo.get_staff_profiles(gym_id, user_ids) if user_ids else {}
        items = []
        for row in users:
            profile = profiles.get(str(row["_id"])) or {}
            items.append(
                StaffRecord(
                    id=as_str_id(row.get("_id")) or "",
                    gymId=as_str_id(gym_id) or "",
                    userId=as_str_id(row.get("_id")) or "",
                    name=row.get("name", ""),
                    role=row.get("role", "trainer"),
                    salary=float(profile.get("salary") or 0),
                    status=profile.get("payroll_status", "pending"),
                )
            )
        return StaffListResponse(items=items, total=len(items))

    def create_trainer(self, actor: dict, payload: StaffCreatePayload) -> StaffRecord:
        gym_id = self._resolve_actor_gym(actor)
        if payload.role != "trainer":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only trainer role is allowed")
        if self.repo.get_user_by_email(gym_id, payload.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
        if self.repo.get_user_by_phone(gym_id, payload.phone):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already exists")

        user = self.repo.create_staff_user(
            {
                "name": payload.name.strip(),
                "email": payload.email.lower().strip(),
                "phone": payload.phone.strip(),
                "password_hash": hash_password(payload.password),
                "gym_id": gym_id,
                "role": "trainer",
                "status": "active",
                "avatar": "".join([part[0] for part in payload.name.split(" ")[:2]]).upper(),
            }
        )
        profile = self.repo.upsert_staff_profile(gym_id=gym_id, user_id=user["_id"], salary=payload.salary, payroll_status="pending")
        log_audit_event(
            self.db,
            action="staff.create_trainer",
            actor_user_id=as_str_id(actor.get("_id")),
            target_type="user",
            target_id=as_str_id(user.get("_id")),
        )
        return StaffRecord(
            id=as_str_id(user.get("_id")) or "",
            gymId=as_str_id(gym_id) or "",
            userId=as_str_id(user.get("_id")) or "",
            name=user.get("name", ""),
            role="trainer",
            salary=float(profile.get("salary") or 0),
            status=profile.get("payroll_status", "pending"),
        )

