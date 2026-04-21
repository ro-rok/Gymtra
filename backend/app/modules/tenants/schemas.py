from pydantic import BaseModel


class TenantBrandingResponse(BaseModel):
    gymId: str
    slug: str
    name: str
    logo: str | None = None
    tagline: str | None = None
    brandColor: str | None = None

