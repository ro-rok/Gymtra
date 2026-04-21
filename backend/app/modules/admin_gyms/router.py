from typing import Annotated

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.db.mongo import get_db
from app.dependencies.auth import require_roles
from app.modules.admin_gyms.repository import AdminGymsRepository
from app.modules.admin_gyms.schemas import GymCreatePayload, GymResponse, GymStatusPayload, GymUpdatePayload
from app.modules.admin_gyms.service import AdminGymsService

router = APIRouter(prefix="/admin/gyms", tags=["admin_gyms"], dependencies=[Depends(require_roles("super_admin"))])


@router.get("", response_model=list[GymResponse])
def list_gyms(db: Annotated[Database, Depends(get_db)]):
    return AdminGymsService(AdminGymsRepository(db)).list_gyms()


@router.post("", response_model=GymResponse)
def create_gym(payload: GymCreatePayload, db: Annotated[Database, Depends(get_db)]):
    return AdminGymsService(AdminGymsRepository(db)).create_gym(payload)


@router.patch("/{gym_id}", response_model=GymResponse)
def update_gym(gym_id: str, payload: GymUpdatePayload, db: Annotated[Database, Depends(get_db)]):
    return AdminGymsService(AdminGymsRepository(db)).update_gym(gym_id, payload)


@router.patch("/{gym_id}/status", response_model=GymResponse)
def update_gym_status(gym_id: str, payload: GymStatusPayload, db: Annotated[Database, Depends(get_db)]):
    return AdminGymsService(AdminGymsRepository(db)).set_gym_status(gym_id, payload.isActive)
