from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pymongo.database import Database

from app.db.mongo import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.modules.member_profiles.reminder_preferences import ReminderPreferencesPatch, ReminderPreferencesResponse
from app.modules.member_profiles.schemas import (
    MemberCreateRequest,
    MemberDashboardSummaryResponse,
    MemberDetailResponse,
    MemberListResponse,
    MemberSelfUpdateRequest,
    MemberUpdateRequest,
)
from app.modules.member_profiles.service import MemberProfilesService

router = APIRouter(prefix="/member-profiles", tags=["member_profiles"])


@router.post("/members", response_model=MemberDetailResponse, dependencies=[Depends(require_roles("owner", "super_admin"))])
def create_member(payload: MemberCreateRequest, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return MemberProfilesService(db).create_member(user, payload)


@router.patch(
    "/members/{member_id}",
    response_model=MemberDetailResponse,
    dependencies=[Depends(require_roles("owner", "super_admin"))],
)
def update_member(member_id: str, payload: MemberUpdateRequest, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return MemberProfilesService(db).update_member(user, member_id, payload)


@router.get(
    "/members/{member_id}",
    response_model=MemberDetailResponse,
    dependencies=[Depends(require_roles("owner", "trainer", "member", "super_admin"))],
)
def get_member(member_id: str, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    target_member_id = member_id if user.get("role") != "member" else str(user.get("_id"))
    return MemberProfilesService(db).get_member_detail(user, target_member_id)


@router.get(
    "/members",
    response_model=MemberListResponse,
    dependencies=[Depends(require_roles("owner", "trainer", "super_admin"))],
)
def list_members(
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
    q: str | None = Query(default=None),
    status: str | None = Query(default=None),
):
    return MemberProfilesService(db).list_members(user, q, status)


@router.patch("/me", response_model=MemberDetailResponse, dependencies=[Depends(require_roles("member"))])
def update_self_profile(payload: MemberSelfUpdateRequest, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return MemberProfilesService(db).update_own_profile(user, payload)


@router.get(
    "/me/reminder-preferences",
    response_model=ReminderPreferencesResponse,
    dependencies=[Depends(require_roles("member"))],
)
def get_reminder_preferences(db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return MemberProfilesService(db).get_reminder_preferences(user)


@router.patch(
    "/me/reminder-preferences",
    response_model=ReminderPreferencesResponse,
    dependencies=[Depends(require_roles("member"))],
)
def update_reminder_preferences(
    payload: ReminderPreferencesPatch,
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
):
    return MemberProfilesService(db).update_reminder_preferences(user, payload)


@router.get(
    "/dashboard/summary",
    response_model=MemberDashboardSummaryResponse,
    dependencies=[Depends(require_roles("owner", "trainer", "super_admin"))],
)
def get_member_dashboard_summary(db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return MemberProfilesService(db).dashboard_summary(user)
