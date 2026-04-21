from app.modules.tenants.repository import TenantsRepository
from app.modules.tenants.schemas import TenantBrandingResponse


class TenantsService:
    def __init__(self, repo: TenantsRepository):
        self.repo = repo

    def get_branding_by_slug(self, slug: str) -> TenantBrandingResponse | None:
        gym, branding = self.repo.get_tenant_by_slug(slug)
        if not gym:
            return None
        return TenantBrandingResponse(
            gymId=str(gym["_id"]),
            slug=gym["slug"],
            name=gym["name"],
            logo=gym.get("logo"),
            tagline=(branding or {}).get("tagline", gym.get("tagline")),
            brandColor=(branding or {}).get("brand_color"),
        )

