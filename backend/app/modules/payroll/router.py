from typing import Annotated

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.db.mongo import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.modules.payroll.schemas import PayrollCreateRequest, PayrollListResponse, PayrollRecord, PayrollUpdateRequest
from app.modules.payroll.service import PayrollService

router = APIRouter(prefix="/payroll", tags=["payroll"])


@router.get("/", response_model=PayrollListResponse, dependencies=[Depends(require_roles("owner", "super_admin"))])
def list_payroll(db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return PayrollService(db).list_records(user)


@router.post("/", response_model=PayrollRecord, dependencies=[Depends(require_roles("owner", "super_admin"))])
def create_payroll(payload: PayrollCreateRequest, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return PayrollService(db).create_record(user, payload)


@router.patch("/{record_id}", response_model=PayrollRecord, dependencies=[Depends(require_roles("owner", "super_admin"))])
def update_payroll(
    record_id: str,
    payload: PayrollUpdateRequest,
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
):
    return PayrollService(db).update_record(user, record_id, payload)

