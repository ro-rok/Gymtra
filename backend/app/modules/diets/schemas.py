from __future__ import annotations

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
    weekday: int | None = Field(default=None, ge=0, le=6)
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
    weekday: int | None = Field(default=None, ge=0, le=6)
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
    weekday: int | None = None
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


class MemberMealPlanResponse(BaseModel):
    nutritionGoal: DietGoal
    nutritionGoalLabel: str
    currentWeightKg: float | None = None
    goalWeightKg: float | None = None
    assignedTemplate: DietTemplateResponse | None = None
    todayRecommended: DietTemplateResponse | None = None
    weeklyRecommended: list[DietTemplateResponse] = Field(default_factory=list)
    completedMealIndexes: list[int] = Field(default_factory=list)
    customMeals: list[DietCustomMeal] = Field(default_factory=list)
    consumedTotals: DietConsumedTotals = Field(default_factory=lambda: DietConsumedTotals())


class DietConsumedTotals(BaseModel):
    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0


class DietCustomMeal(BaseModel):
    mealId: str
    name: str
    time: str | None = None
    calories: float = Field(ge=0)
    protein: float = Field(ge=0)
    carbs: float = Field(ge=0)
    fat: float = Field(ge=0)
    note: str | None = None
    consumedAt: str


class DietMealToggleRequest(BaseModel):
    memberId: str | None = None
    day: str | None = None
    mealIndex: int = Field(ge=0, le=20)
    consumed: bool


class DietMealToggleResponse(BaseModel):
    day: str
    completedMealIndexes: list[int] = Field(default_factory=list)
    consumedTotals: DietConsumedTotals = Field(default_factory=lambda: DietConsumedTotals())


class DietCustomMealCreateRequest(BaseModel):
    memberId: str | None = None
    day: str | None = None
    name: str = Field(min_length=1, max_length=140)
    time: str | None = None
    calories: float = Field(ge=0)
    protein: float = Field(default=0, ge=0)
    carbs: float = Field(default=0, ge=0)
    fat: float = Field(default=0, ge=0)
    note: str | None = Field(default=None, max_length=500)


class DietCustomMealDeleteRequest(BaseModel):
    memberId: str | None = None
    day: str | None = None
    mealId: str


class DietMacroSeriesItem(BaseModel):
    day: str
    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0


class DietMacroSeriesResponse(BaseModel):
    month: str
    items: list[DietMacroSeriesItem] = Field(default_factory=list)

