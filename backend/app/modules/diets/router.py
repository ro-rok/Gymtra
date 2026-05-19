from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pymongo.database import Database

from app.db.mongo import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.modules.diets.schemas import (
    DietAssignmentRequest,
    DietAssignmentResponse,
    DietTemplateCreateRequest,
    DietTemplateListResponse,
    DietTemplateResponse,
    DietTemplateUpdateRequest,
    MemberActiveDietResponse,
    MemberMealPlanResponse,
)
from app.modules.diets.service import DietsService

router = APIRouter(prefix="/diets", tags=["diets"])


@router.get("/templates", response_model=DietTemplateListResponse, dependencies=[Depends(require_roles("owner", "trainer", "super_admin"))])
def list_templates(db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return DietsService(db).list_templates(user)


@router.post("/templates", response_model=DietTemplateResponse, dependencies=[Depends(require_roles("owner", "trainer", "super_admin"))])
def create_template(payload: DietTemplateCreateRequest, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return DietsService(db).create_template(user, payload)


@router.patch(
    "/templates/{template_id}",
    response_model=DietTemplateResponse,
    dependencies=[Depends(require_roles("owner", "trainer", "super_admin"))],
)
def update_template(
    template_id: str,
    payload: DietTemplateUpdateRequest,
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
):
    return DietsService(db).update_template(user, template_id, payload)


@router.post("/assignments", response_model=DietAssignmentResponse, dependencies=[Depends(require_roles("owner", "trainer", "super_admin"))])
def assign_template(payload: DietAssignmentRequest, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return DietsService(db).assign_template(user, payload.memberId, payload.templateId)


@router.get("/members/active", response_model=MemberActiveDietResponse, dependencies=[Depends(require_roles("owner", "trainer", "member", "super_admin"))])
def get_member_active_diet(
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
    memberId: str | None = Query(default=None),
):
    return DietsService(db).get_member_active_diet(user, memberId)


@router.get(
    "/members/meal-plan",
    response_model=MemberMealPlanResponse,
    dependencies=[Depends(require_roles("owner", "trainer", "member", "super_admin"))],
)
def get_member_meal_plan(
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
    memberId: str | None = Query(default=None),
):
    return DietsService(db).get_member_meal_plan(user, memberId)

