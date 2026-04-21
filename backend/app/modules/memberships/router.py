from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pymongo.database import Database

from app.db.mongo import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.modules.memberships.schemas import MembershipCreateRequest, MembershipListResponse, MembershipRenewRequest, MembershipResponse
from app.modules.memberships.service import MembershipsService

router = APIRouter(prefix="/memberships", tags=["memberships"])


@router.post("/", response_model=MembershipResponse, dependencies=[Depends(require_roles("owner", "super_admin"))])
def create_membership(payload: MembershipCreateRequest, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return MembershipsService(db).create_membership(user, payload)


@router.post(
    "/members/{member_id}/renew",
    response_model=MembershipResponse,
    dependencies=[Depends(require_roles("owner", "super_admin"))],
)
def renew_membership(member_id: str, payload: MembershipRenewRequest, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return MembershipsService(db).renew_membership(user, member_id, payload)


@router.get(
    "/",
    response_model=MembershipListResponse,
    dependencies=[Depends(require_roles("owner", "trainer", "member", "super_admin"))],
)
def list_memberships(
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
    status: str | None = Query(default=None),
    expiring: bool = Query(default=False),
    expired: bool = Query(default=False),
):
    return MembershipsService(db).list_memberships(user, status, expiring, expired)
