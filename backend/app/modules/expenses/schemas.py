from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

ExpenseCategory = Literal["Rent", "Electricity", "Water", "Maintenance", "Misc"]


class ExpenseCreateRequest(BaseModel):
    category: ExpenseCategory
    amount: float = Field(gt=0)
    date: date
    recurring: bool = False
    notes: str | None = None


class ExpenseUpdateRequest(BaseModel):
    category: ExpenseCategory | None = None
    amount: float | None = Field(default=None, gt=0)
    date: date | None = None
    recurring: bool | None = None
    notes: str | None = None


class ExpenseRecord(BaseModel):
    id: str
    gymId: str
    category: ExpenseCategory
    amount: float
    date: str
    recurring: bool
    notes: str | None = None


class ExpenseListResponse(BaseModel):
    items: list[ExpenseRecord]
    total: int

