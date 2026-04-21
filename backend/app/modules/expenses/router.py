from typing import Annotated

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.db.mongo import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.modules.expenses.schemas import ExpenseCreateRequest, ExpenseListResponse, ExpenseRecord, ExpenseUpdateRequest
from app.modules.expenses.service import ExpensesService

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("/", response_model=ExpenseListResponse, dependencies=[Depends(require_roles("owner", "super_admin"))])
def list_expenses(db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return ExpensesService(db).list_expenses(user)


@router.post("/", response_model=ExpenseRecord, dependencies=[Depends(require_roles("owner", "super_admin"))])
def create_expense(payload: ExpenseCreateRequest, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return ExpensesService(db).create_expense(user, payload)


@router.patch("/{expense_id}", response_model=ExpenseRecord, dependencies=[Depends(require_roles("owner", "super_admin"))])
def update_expense(
    expense_id: str,
    payload: ExpenseUpdateRequest,
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
):
    return ExpensesService(db).update_expense(user, expense_id, payload)

