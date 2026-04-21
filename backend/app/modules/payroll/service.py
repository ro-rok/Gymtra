from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.audit import log_audit_event
from app.core.serializers import as_str_id
from app.modules.payroll.repository import PayrollRepository
from app.modules.payroll.schemas import PayrollCreateRequest, PayrollListResponse, PayrollRecord, PayrollUpdateRequest
from app.modules.staff.repository import StaffRepository


class PayrollService:
    def __init__(self, db: Database):
        self.db = db
        self.repo = PayrollRepository(db)
        self.staff_repo = StaffRepository(db)

    @staticmethod
    def _resolve_actor_gym(actor: dict) -> ObjectId:
        gym_id = actor.get("gym_id")
        if not gym_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gym context is required")
        return gym_id

    @staticmethod
    def _to_record(row: dict) -> PayrollRecord:
        paid_at = row.get("paid_at")
        return PayrollRecord(
            id=as_str_id(row.get("_id")) or "",
            staffId=as_str_id(row.get("staff_id")) or "",
            gymId=as_str_id(row.get("gym_id")) or "",
            month=row.get("month", ""),
            amount=float(row.get("amount") or 0),
            status=row.get("status", "pending"),
            paidAt=paid_at.isoformat() if paid_at else None,
        )

    def _ensure_staff(self, gym_id: ObjectId, staff_id: str) -> ObjectId:
        if not ObjectId.is_valid(staff_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")
        staff_oid = ObjectId(staff_id)
        staff = self.db.users.find_one({"_id": staff_oid, "gym_id": gym_id, "role": {"$in": ["owner", "trainer"]}})
        if not staff:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")
        return staff_oid

    def list_records(self, actor: dict) -> PayrollListResponse:
        gym_id = self._resolve_actor_gym(actor)
        rows = self.repo.list_records(gym_id)
        return PayrollListResponse(items=[self._to_record(row) for row in rows], total=len(rows))

    def create_record(self, actor: dict, payload: PayrollCreateRequest) -> PayrollRecord:
        gym_id = self._resolve_actor_gym(actor)
        staff_oid = self._ensure_staff(gym_id, payload.staffId)
        paid_at = datetime.now(timezone.utc) if payload.status == "paid" else None
        row = self.repo.create_record(
            {
                "gym_id": gym_id,
                "staff_id": staff_oid,
                "month": payload.month,
                "amount": payload.amount,
                "status": payload.status,
                "paid_at": paid_at,
                "created_by": actor.get("_id"),
            }
        )
        self.staff_repo.upsert_staff_profile(gym_id, staff_oid, salary=payload.amount, payroll_status=payload.status)
        log_audit_event(self.db, action="payroll.create", actor_user_id=as_str_id(actor.get("_id")), target_id=payload.staffId)
        return self._to_record(row)

    def update_record(self, actor: dict, record_id: str, payload: PayrollUpdateRequest) -> PayrollRecord:
        gym_id = self._resolve_actor_gym(actor)
        if not ObjectId.is_valid(record_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll record not found")
        update_data = payload.model_dump(exclude_none=True)
        if "paidAt" in update_data:
            update_data["paid_at"] = datetime.fromisoformat(update_data.pop("paidAt"))
        elif update_data.get("status") == "paid":
            update_data["paid_at"] = datetime.now(timezone.utc)
        row = self.repo.update_record(ObjectId(record_id), gym_id, update_data)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll record not found")
        self.staff_repo.upsert_staff_profile(gym_id, row["staff_id"], salary=row.get("amount"), payroll_status=row.get("status"))
        log_audit_event(self.db, action="payroll.update", actor_user_id=as_str_id(actor.get("_id")), target_id=record_id)
        return self._to_record(row)

