from datetime import date as dt_date
from typing import Literal

from pydantic import BaseModel

LeaveType = Literal["sick", "vacation", "personal"]


class LeaveCreateRequest(BaseModel):
    staffId: str
    date: dt_date
    reason: str | None = None
    type: LeaveType = "sick"


class LeaveUpdateRequest(BaseModel):
    date: dt_date | None = None
    reason: str | None = None
    type: LeaveType | None = None
    status: str | None = None


class LeaveRecord(BaseModel):
    id: str
    staffId: str
    staffName: str | None = None
    gymId: str
    date: str
    reason: str | None = None
    type: LeaveType
    status: str


class LeaveListResponse(BaseModel):
    items: list[LeaveRecord]
    total: int

