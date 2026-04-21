from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.audit import log_audit_event
from app.core.serializers import as_str_id
from app.modules.expenses.repository import ExpensesRepository
from app.modules.expenses.schemas import ExpenseCreateRequest, ExpenseListResponse, ExpenseRecord, ExpenseUpdateRequest


class ExpensesService:
    def __init__(self, db: Database):
        self.db = db
        self.repo = ExpensesRepository(db)

    @staticmethod
    def _resolve_actor_gym(actor: dict) -> ObjectId:
        gym_id = actor.get("gym_id")
        if not gym_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gym context is required")
        return gym_id

    @staticmethod
    def _to_record(row: dict) -> ExpenseRecord:
        return ExpenseRecord(
            id=as_str_id(row.get("_id")) or "",
            gymId=as_str_id(row.get("gym_id")) or "",
            category=row.get("category", "Misc"),
            amount=float(row.get("amount") or 0),
            date=(row.get("expense_date") or datetime.now(timezone.utc)).strftime("%Y-%m-%d"),
            recurring=bool(row.get("recurring")),
            notes=row.get("notes"),
        )

    def list_expenses(self, actor: dict) -> ExpenseListResponse:
        gym_id = self._resolve_actor_gym(actor)
        items = [self._to_record(row) for row in self.repo.list_expenses(gym_id)]
        return ExpenseListResponse(items=items, total=len(items))

    def create_expense(self, actor: dict, payload: ExpenseCreateRequest) -> ExpenseRecord:
        gym_id = self._resolve_actor_gym(actor)
        row = self.repo.create_expense(
            {
                "gym_id": gym_id,
                "category": payload.category,
                "amount": payload.amount,
                "expense_date": datetime.combine(payload.date, datetime.min.time(), tzinfo=timezone.utc),
                "recurring": payload.recurring,
                "notes": payload.notes,
                "created_by": actor.get("_id"),
            }
        )
        log_audit_event(self.db, action="expenses.create", actor_user_id=as_str_id(actor.get("_id")))
        return self._to_record(row)

    def update_expense(self, actor: dict, expense_id: str, payload: ExpenseUpdateRequest) -> ExpenseRecord:
        gym_id = self._resolve_actor_gym(actor)
        if not ObjectId.is_valid(expense_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
        update_data = payload.model_dump(exclude_none=True)
        if "date" in update_data:
            update_data["expense_date"] = datetime.combine(update_data.pop("date"), datetime.min.time(), tzinfo=timezone.utc)
        row = self.repo.update_expense(ObjectId(expense_id), gym_id, update_data)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
        log_audit_event(self.db, action="expenses.update", actor_user_id=as_str_id(actor.get("_id")), target_id=expense_id)
        return self._to_record(row)

