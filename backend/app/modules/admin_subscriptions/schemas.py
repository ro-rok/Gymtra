from pydantic import BaseModel, Field


class SubscriptionUpdatePayload(BaseModel):
    plan: str | None = None
    seatCount: int | None = Field(default=None, ge=1, le=10000)
    usedSeats: int | None = Field(default=None, ge=0, le=10000)
    baseAmount: float | None = Field(default=None, ge=0)
    extraStaffPrice: float | None = Field(default=None, ge=0)
    status: str | None = None
    periodStart: str | None = None
    periodEnd: str | None = None


class SubscriptionResponse(BaseModel):
    id: str
    gymId: str
    plan: str
    seats: int
    usedSeats: int
    status: str
    startDate: str
    endDate: str
    monthlyAmount: float
    extraSeatPrice: float
