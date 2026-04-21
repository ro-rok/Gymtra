from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

DietGoal = Literal["loss", "gain", "maintain"]


class DietMeal(BaseModel):
    time: str
    name: str
    cal: int = Field(ge=0)
    macros: str = ""


class DietMacros(BaseModel):
    protein: float | None = Field(default=None, ge=0)
    carbs: float | None = Field(default=None, ge=0)
    fat: float | None = Field(default=None, ge=0)


class DietTemplateCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    goal: DietGoal
    calories: int = Field(ge=0)
    meals: int = Field(ge=1, le=12)
    tags: list[str] = Field(default_factory=list)
    mealPlan: list[DietMeal] = Field(default_factory=list)
    macros: DietMacros | None = None
    notes: str | None = None
    preferenceTags: list[str] = Field(default_factory=list)
    allergyTags: list[str] = Field(default_factory=list)


class DietTemplateUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    goal: DietGoal | None = None
    calories: int | None = Field(default=None, ge=0)
    meals: int | None = Field(default=None, ge=1, le=12)
    tags: list[str] | None = None
    mealPlan: list[DietMeal] | None = None
    macros: DietMacros | None = None
    notes: str | None = None
    preferenceTags: list[str] | None = None
    allergyTags: list[str] | None = None


class DietTemplateResponse(BaseModel):
    id: str
    gymId: str
    name: str
    goal: DietGoal
    calories: int
    meals: int
    tags: list[str]
    mealPlan: list[DietMeal]
    macros: DietMacros | None
    notes: str | None
    preferenceTags: list[str]
    allergyTags: list[str]
    createdBy: str
    updatedAt: str


class DietTemplateListResponse(BaseModel):
    items: list[DietTemplateResponse]
    total: int


class DietAssignmentRequest(BaseModel):
    memberId: str
    templateId: str


class DietAssignmentResponse(BaseModel):
    id: str
    memberId: str
    templateId: str
    gymId: str
    assignedBy: str
    assignedAt: str
    active: bool


class MemberActiveDietResponse(BaseModel):
    assignment: DietAssignmentResponse | None = None
    template: DietTemplateResponse | None = None

