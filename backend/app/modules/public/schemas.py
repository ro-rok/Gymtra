from pydantic import BaseModel


class PublicGymSummary(BaseModel):
    id: str
    slug: str
    name: str
    logo: str | None = None
    city: str
    members: int = 0
    tagline: str | None = None
    isActive: bool
    createdAt: str


class PublicGymDetail(PublicGymSummary):
    brandColor: str | None = None
    metaTitle: str | None = None
    metaDescription: str | None = None

