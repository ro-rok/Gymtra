from datetime import date as dt_date
from typing import Literal

from pydantic import BaseModel, Field

AttendanceStatus = Literal["present", "skipped"]
QrMode = Literal["dynamic", "static"]


class AttendanceMarkPayload(BaseModel):
    memberId: str
    date: dt_date
    status: AttendanceStatus


class MemberCheckInPayload(BaseModel):
    date: dt_date | None = None


class QrVerifyPayload(BaseModel):
    mode: QrMode = "dynamic"
    token: str | None = Field(default=None, min_length=8)


class DailyTaskUpsertPayload(BaseModel):
    date: dt_date
    workout: bool
    meal: bool
    water: bool
    waterLiters: float | None = Field(default=None, ge=0)


class AttendanceRecord(BaseModel):
    id: str
    memberId: str
    gymId: str
    date: str
    status: AttendanceStatus
    markedBy: str
    source: Literal["manual", "member_self", "qr", "static_qr"]
    trustLevel: Literal["high", "low"] = "high"


class DailyTaskRecord(BaseModel):
    id: str
    memberId: str
    gymId: str
    date: str
    workout: bool
    meal: bool
    water: bool
    waterLiters: float


class AttendanceDayResponse(BaseModel):
    date: str
    items: list[AttendanceRecord]


class MemberTaskStats(BaseModel):
    streak: int
    completedDays: int
    skippedDaysThisMonth: int
    absentDays30: int
    longAbsent: bool


class MemberDashboardAttendanceTasksResponse(BaseModel):
    todayTasks: DailyTaskRecord | None
    attendance: list[AttendanceRecord]
    stats: MemberTaskStats


class QrTokenResponse(BaseModel):
    token: str
    expiresAt: str

