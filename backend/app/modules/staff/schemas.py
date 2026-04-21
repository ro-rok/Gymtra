from pydantic import BaseModel


class StaffRecord(BaseModel):
    id: str
    gymId: str
    userId: str
    name: str
    role: str
    salary: float
    status: str


class StaffListResponse(BaseModel):
    items: list[StaffRecord]
    total: int

