from pydantic import BaseModel, EmailStr, Field


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


class StaffCreatePayload(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=5, max_length=32)
    password: str = Field(min_length=6, max_length=128)
    role: str = "trainer"
    salary: float = Field(ge=0)

