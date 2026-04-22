from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pymongo.database import Database

from app.db.mongo import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.modules.progress.schemas import ProgressListResponse, ProgressLogCreateRequest, ProgressLogRecord, ProgressSeriesResponse
from app.modules.progress.service import ProgressService

router = APIRouter(prefix="/progress", tags=["progress"])


@router.post("/logs", response_model=ProgressLogRecord, dependencies=[Depends(require_roles("member"))])
def add_progress_log(payload: ProgressLogCreateRequest, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return ProgressService(db).add_log(user, payload)


@router.get("/logs", response_model=ProgressListResponse, dependencies=[Depends(require_roles("owner", "trainer", "member", "super_admin"))])
def list_progress_logs(
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
    memberId: str | None = Query(default=None),
):
    return ProgressService(db).list_logs(user, memberId)


@router.get("/series", response_model=ProgressSeriesResponse, dependencies=[Depends(require_roles("owner", "trainer", "member", "super_admin"))])
def get_progress_series(
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
    memberId: str | None = Query(default=None),
):
    return ProgressService(db).series(user, memberId)


@router.delete("/logs/{logId}", dependencies=[Depends(require_roles("member", "owner", "super_admin"))])
def delete_progress_log(
    logId: str,
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
):
    return ProgressService(db).delete_log(user, logId)

