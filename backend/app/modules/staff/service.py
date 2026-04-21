from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.serializers import as_str_id
from app.modules.staff.repository import StaffRepository
from app.modules.staff.schemas import StaffListResponse, StaffRecord


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

