from pydantic import BaseModel, Field


class PayrollCreateRequest(BaseModel):
    staffId: str
    month: str = Field(min_length=7, max_length=7)
    amount: float = Field(gt=0)
    status: str = "pending"


class PayrollUpdateRequest(BaseModel):
    amount: float | None = Field(default=None, gt=0)
    status: str | None = None
    paidAt: str | None = None


class PayrollRecord(BaseModel):
    id: str
    staffId: str
    gymId: str
    month: str
    amount: float
    status: str
    paidAt: str | None = None


class PayrollListResponse(BaseModel):
    items: list[PayrollRecord]
    total: int

