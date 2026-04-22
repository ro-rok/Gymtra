from pydantic import BaseModel


class TenantBrandingResponse(BaseModel):
    gymId: str
    slug: str
    name: str
    logo: str | None = None
    tagline: str | None = None
    brandColor: str | None = None


class TenantLogoUploadSignRequest(BaseModel):
    fileName: str
    contentType: str


class TenantLogoUploadSignResponse(BaseModel):
    cloudName: str
    apiKey: str
    timestamp: int
    folder: str
    publicId: str
    signature: str


class TenantLogoUpdateRequest(BaseModel):
    logoUrl: str

