from typing import Annotated

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.db.mongo import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.modules.staff.schemas import StaffCreatePayload, StaffListResponse, StaffRecord
from app.modules.staff.service import StaffService

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("/", response_model=StaffListResponse, dependencies=[Depends(require_roles("owner", "super_admin"))])
def list_staff(db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return StaffService(db).list_staff(user)


@router.post("/", response_model=StaffRecord, dependencies=[Depends(require_roles("owner"))])
def create_staff(payload: StaffCreatePayload, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return StaffService(db).create_trainer(user, payload)

