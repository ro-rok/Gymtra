from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.audit import log_audit_event
from app.core.serializers import as_str_id
from app.modules.leave_records.repository import LeaveRecordsRepository
from app.modules.leave_records.schemas import LeaveCreateRequest, LeaveListResponse, LeaveRecord, LeaveUpdateRequest


class LeaveRecordsService:
    def __init__(self, db: Database):
        self.db = db
        self.repo = LeaveRecordsRepository(db)

    @staticmethod
    def _resolve_actor_gym(actor: dict) -> ObjectId:
        gym_id = actor.get("gym_id")
        if not gym_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gym context is required")
        return gym_id

    def _ensure_staff(self, gym_id: ObjectId, staff_id: str) -> dict:
        if not ObjectId.is_valid(staff_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")
        row = self.db.users.find_one({"_id": ObjectId(staff_id), "gym_id": gym_id, "role": {"$in": ["owner", "trainer"]}})
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")
        return row

    @staticmethod
    def _to_record(row: dict) -> LeaveRecord:
        return LeaveRecord(
            id=as_str_id(row.get("_id")) or "",
            staffId=as_str_id(row.get("staff_id")) or "",
            staffName=row.get("staff_name"),
            gymId=as_str_id(row.get("gym_id")) or "",
            date=(row.get("leave_date") or datetime.now(timezone.utc)).strftime("%Y-%m-%d"),
            reason=row.get("reason"),
            type=row.get("leave_type", "sick"),
            status=row.get("status", "approved"),
        )

    def list_records(self, actor: dict) -> LeaveListResponse:
        gym_id = self._resolve_actor_gym(actor)
        rows = self.repo.list_records(gym_id)
        return LeaveListResponse(items=[self._to_record(row) for row in rows], total=len(rows))

    def create_record(self, actor: dict, payload: LeaveCreateRequest) -> LeaveRecord:
        gym_id = self._resolve_actor_gym(actor)
        staff = self._ensure_staff(gym_id, payload.staffId)
        row = self.repo.create_record(
            {
                "gym_id": gym_id,
                "staff_id": staff["_id"],
                "staff_name": staff.get("name"),
                "leave_date": datetime.combine(payload.date, datetime.min.time(), tzinfo=timezone.utc),
                "reason": payload.reason,
                "leave_type": payload.type,
                "status": "approved",
                "created_by": actor.get("_id"),
            }
        )
        log_audit_event(self.db, action="leave.create", actor_user_id=as_str_id(actor.get("_id")), target_id=payload.staffId)
        return self._to_record(row)

    def update_record(self, actor: dict, record_id: str, payload: LeaveUpdateRequest) -> LeaveRecord:
        gym_id = self._resolve_actor_gym(actor)
        if not ObjectId.is_valid(record_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave record not found")
        update_data = payload.model_dump(exclude_none=True)
        if "date" in update_data:
            update_data["leave_date"] = datetime.combine(update_data.pop("date"), datetime.min.time(), tzinfo=timezone.utc)
        if "type" in update_data:
            update_data["leave_type"] = update_data.pop("type")
        row = self.repo.update_record(ObjectId(record_id), gym_id, update_data)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave record not found")
        log_audit_event(self.db, action="leave.update", actor_user_id=as_str_id(actor.get("_id")), target_id=record_id)
        return self._to_record(row)

