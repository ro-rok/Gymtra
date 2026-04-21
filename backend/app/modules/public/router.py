from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.db.mongo import get_db
from app.modules.public.repository import PublicRepository
from app.modules.public.schemas import PublicGymDetail, PublicGymSummary
from app.modules.public.service import PublicService

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/gyms", response_model=list[PublicGymSummary])
def list_gyms(db: Annotated[Database, Depends(get_db)]):
    return PublicService(PublicRepository(db)).list_gyms()


@router.get("/gyms/{slug}", response_model=PublicGymDetail)
def get_gym(slug: str, db: Annotated[Database, Depends(get_db)]):
    gym = PublicService(PublicRepository(db)).get_gym(slug)
    if not gym:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gym not found")
    return gym

