from datetime import date

from pydantic import BaseModel, Field


class ProgressLogCreateRequest(BaseModel):
    weightKg: float = Field(gt=0)
    bodyFatPct: float | None = Field(default=None, ge=0, le=100)
    measurements: dict[str, float] | None = None
    notes: str | None = None
    date: date | None = None


class ProgressLogRecord(BaseModel):
    id: str
    memberId: str
    gymId: str
    date: str
    weightKg: float
    bodyFatPct: float | None = None
    measurements: dict[str, float] | None = None
    notes: str | None = None


class ProgressListResponse(BaseModel):
    items: list[ProgressLogRecord]
    total: int


class ProgressSeriesPoint(BaseModel):
    date: str
    weightKg: float
    bodyFatPct: float | None = None
    measurements: dict[str, float] | None = None


class ProgressSeriesResponse(BaseModel):
    points: list[ProgressSeriesPoint]
    firstWeight: float | None = None
    latestWeight: float | None = None
    deltaWeight: float = 0

