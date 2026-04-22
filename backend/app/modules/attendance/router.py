from datetime import date as date_type
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pymongo.database import Database

from app.db.mongo import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.modules.attendance.schemas import (
    AttendanceDayResponse,
    AttendanceMarkPayload,
    AttendanceRecord,
    DailyTaskRecord,
    DailyTaskUpsertPayload,
    MemberCheckInPayload,
    MemberDashboardAttendanceTasksResponse,
    QrTokenResponse,
    QrVerifyPayload,
)
from app.modules.attendance.service import AttendanceService

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get(
    "/day",
    response_model=AttendanceDayResponse,
    dependencies=[Depends(require_roles("owner", "trainer", "super_admin"))],
)
def get_day_attendance(
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
    date: str | None = Query(default=None),
):
    parsed = None if not date else date_type.fromisoformat(date)
    return AttendanceService(db).list_day_attendance(actor=user, day=parsed)


@router.post(
    "/mark",
    response_model=AttendanceRecord,
    dependencies=[Depends(require_roles("owner", "trainer", "super_admin"))],
)
def mark_attendance(payload: AttendanceMarkPayload, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return AttendanceService(db).mark_attendance(
        actor=user,
        member_id=payload.memberId,
        day=payload.date,
        status_text=payload.status,
    )


@router.post("/self-checkin", response_model=AttendanceRecord, dependencies=[Depends(require_roles("member"))])
def self_checkin(payload: MemberCheckInPayload, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return AttendanceService(db).member_self_checkin(actor=user, day=payload.date)


@router.post(
    "/qr/token",
    response_model=QrTokenResponse,
    dependencies=[Depends(require_roles("owner", "trainer", "super_admin"))],
)
def create_qr_token(db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return AttendanceService(db).create_qr_token(actor=user)


@router.post("/qr/verify", response_model=AttendanceRecord, dependencies=[Depends(require_roles("member"))])
def verify_qr_token(payload: QrVerifyPayload, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return AttendanceService(db).verify_qr_and_checkin(actor=user, token=payload.token, mode=payload.mode)


@router.post("/tasks", response_model=DailyTaskRecord, dependencies=[Depends(require_roles("member", "owner", "trainer"))])
def upsert_daily_tasks(
    payload: DailyTaskUpsertPayload,
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
    memberId: str | None = Query(default=None),
):
    target_member_id = memberId or ""
    return AttendanceService(db).upsert_daily_task(
        actor=user,
        member_id=target_member_id,
        day=payload.date,
        workout=payload.workout,
        meal=payload.meal,
        water=payload.water,
        water_liters=payload.waterLiters,
    )


@router.get("/member/dashboard", response_model=MemberDashboardAttendanceTasksResponse, dependencies=[Depends(require_roles("member"))])
def member_dashboard_data(db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return AttendanceService(db).member_dashboard_data(actor=user)

