from pydantic import BaseModel, Field


class GymCreatePayload(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=80)
    city: str = Field(min_length=1, max_length=80)
    tagline: str | None = Field(default=None, max_length=180)
    logo: str | None = None
    seatCount: int = Field(default=5, ge=1, le=10000)
    ownerUserId: str | None = None
    adminUserId: str | None = None
    isActive: bool = True
    brandColor: str | None = None
    metaTitle: str | None = None
    metaDescription: str | None = None


class GymUpdatePayload(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    city: str | None = Field(default=None, min_length=1, max_length=80)
    tagline: str | None = Field(default=None, max_length=180)
    logo: str | None = None
    seatCount: int | None = Field(default=None, ge=1, le=10000)
    ownerUserId: str | None = None
    adminUserId: str | None = None
    isActive: bool | None = None
    brandColor: str | None = None
    metaTitle: str | None = None
    metaDescription: str | None = None


class GymStatusPayload(BaseModel):
    isActive: bool


class GymResponse(BaseModel):
    id: str
    slug: str
    name: str
    city: str
    tagline: str | None = None
    logo: str | None = None
    members: int = 0
    isActive: bool
    seatCount: int
    ownerUserId: str | None = None
    adminUserId: str | None = None
    createdAt: str
    brandColor: str | None = None
    metaTitle: str | None = None
    metaDescription: str | None = None
