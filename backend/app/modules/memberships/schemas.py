from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

MembershipPlan = Literal["monthly", "quarterly", "half_yearly"]
MembershipStatus = Literal["active", "expired", "cancelled", "pending_renewal"]


class MembershipCreateRequest(BaseModel):
    memberId: str
    plan: MembershipPlan
    amount: float = Field(gt=0)
    startDate: date | None = None


class MembershipRenewRequest(BaseModel):
    plan: MembershipPlan
    amount: float = Field(gt=0)
    startDate: date | None = None


class MembershipResponse(BaseModel):
    id: str
    memberId: str
    gymId: str
    plan: MembershipPlan
    amount: float
    startDate: str
    endDate: str
    status: MembershipStatus
    renewedFromId: str | None = None


class MembershipListResponse(BaseModel):
    items: list[MembershipResponse]
    total: int
