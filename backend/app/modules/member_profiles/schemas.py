from datetime import date as dt_date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

MemberStatus = Literal["active", "expired", "pending_renewal"]
Gender = Literal["male", "female", "other"]
ActivityLevel = Literal["sedentary", "lightly_active", "active", "athlete"]


class MemberProfileBase(BaseModel):
    age: int | None = Field(default=None, ge=1, le=120)
    gender: Gender | None = None
    heightCm: float | None = Field(default=None, gt=0)
    currentWeightKg: float | None = Field(default=None, gt=0)
    goalWeightKg: float | None = Field(default=None, gt=0)
    activityLevel: ActivityLevel | None = None
    allergies: str | None = None
    foodPreference: str | None = None
    medicalConditions: str | None = None
    mealTimings: str | None = None
    bodyFatPct: float | None = Field(default=None, ge=0, le=100)
    measurements: dict[str, float] | None = None


class MemberCreateRequest(MemberProfileBase):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=5, max_length=32)
    password: str = Field(min_length=6, max_length=128)
    joinDate: dt_date


class MemberUpdateRequest(MemberProfileBase):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, min_length=5, max_length=32)
    email: EmailStr | None = None
    joinDate: dt_date | None = None
    status: MemberStatus | None = None


class MemberSelfUpdateRequest(BaseModel):
    age: int | None = Field(default=None, ge=1, le=120)
    heightCm: float | None = Field(default=None, gt=0)
    currentWeightKg: float | None = Field(default=None, gt=0)
    goalWeightKg: float | None = Field(default=None, gt=0)
    activityLevel: ActivityLevel | None = None
    allergies: str | None = None
    foodPreference: str | None = None
    medicalConditions: str | None = None
    mealTimings: str | None = None
    bodyFatPct: float | None = Field(default=None, ge=0, le=100)
    measurements: dict[str, float] | None = None


class MemberListQuery(BaseModel):
    q: str | None = None
    status: MemberStatus | None = None


class MemberSummaryResponse(BaseModel):
    id: str
    gymId: str
    name: str
    email: str
    phone: str | None = None
    joinDate: str
    status: MemberStatus
    avatar: str | None = None
    age: int | None = None
    gender: str | None = None
    activityLevel: str | None = None
    foodPreference: str | None = None


class MembershipSnapshot(BaseModel):
    id: str
    plan: str
    amount: float
    startDate: str
    endDate: str
    status: str


class MemberDetailResponse(MemberSummaryResponse):
    heightCm: float | None = None
    currentWeightKg: float | None = None
    goalWeightKg: float | None = None
    allergies: str | None = None
    medicalConditions: str | None = None
    mealTimings: str | None = None
    bodyFatPct: float | None = None
    measurements: dict[str, float] | None = None
    membership: MembershipSnapshot | None = None


class MemberListResponse(BaseModel):
    items: list[MemberSummaryResponse]
    total: int


class MemberDashboardSummaryResponse(BaseModel):
    total: int
    active: int
    expired: int
    pendingRenewal: int
    expiringSoon: int
    unpaid: int


class MemberProfileDoc(BaseModel):
    user_id: str
    gym_id: str
    age: int | None = None
    gender: str | None = None
    height_cm: float | None = None
    current_weight_kg: float | None = None
    goal_weight_kg: float | None = None
    activity_level: str | None = None
    allergies: str | None = None
    food_preference: str | None = None
    medical_conditions: str | None = None
    meal_timings: str | None = None
    body_fat_pct: float | None = None
    measurements: dict[str, float] | None = None
    created_at: datetime
    updated_at: datetime
