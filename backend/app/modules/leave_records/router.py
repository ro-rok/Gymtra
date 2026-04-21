from typing import Annotated

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.db.mongo import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.modules.leave_records.schemas import LeaveCreateRequest, LeaveListResponse, LeaveRecord, LeaveUpdateRequest
from app.modules.leave_records.service import LeaveRecordsService

router = APIRouter(prefix="/leave-records", tags=["leave_records"])


@router.get("/", response_model=LeaveListResponse, dependencies=[Depends(require_roles("owner", "super_admin"))])
def list_leave_records(db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return LeaveRecordsService(db).list_records(user)


@router.post("/", response_model=LeaveRecord, dependencies=[Depends(require_roles("owner", "super_admin"))])
def create_leave_record(payload: LeaveCreateRequest, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return LeaveRecordsService(db).create_record(user, payload)


@router.patch("/{record_id}", response_model=LeaveRecord, dependencies=[Depends(require_roles("owner", "super_admin"))])
def update_leave_record(
    record_id: str,
    payload: LeaveUpdateRequest,
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
):
    return LeaveRecordsService(db).update_record(user, record_id, payload)

