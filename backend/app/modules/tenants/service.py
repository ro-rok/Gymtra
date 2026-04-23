import hashlib
import re
import time

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.modules.tenants.repository import TenantsRepository
from app.modules.tenants.schemas import (
    TenantBrandingResponse,
    TenantLogoUpdateRequest,
    TenantLogoUploadSignRequest,
    TenantLogoUploadSignResponse,
    TenantPlanPricing,
    TenantPricingResponse,
    TenantPricingUpdateRequest,
)


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

    def get_pricing_by_slug(self, slug: str) -> TenantPricingResponse | None:
        gym, _ = self.repo.get_tenant_by_slug(slug)
        if not gym:
            return None
        raw = gym.get("membership_pricing") or {}
        pricing = TenantPlanPricing(
            monthly=float(raw.get("monthly", 1500)),
            quarterly=float(raw.get("quarterly", 4000)),
            halfYearly=float(raw.get("half_yearly", 7000)),
        )
        return TenantPricingResponse(gymId=str(gym["_id"]), slug=gym["slug"], planPricing=pricing)

    @staticmethod
    def _slugify_filename(file_name: str) -> str:
        stem = file_name.rsplit(".", 1)[0].strip().lower() or "logo"
        return re.sub(r"[^a-z0-9]+", "-", stem).strip("-")[:48] or "logo"

    def create_logo_upload_signature(
        self,
        *,
        actor: dict,
        slug: str,
        payload: TenantLogoUploadSignRequest,
    ) -> TenantLogoUploadSignResponse:
        gym, _ = self.repo.get_tenant_by_slug(slug)
        if not gym:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
        if str(actor.get("gym_id") or "") != str(gym.get("_id")):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden for current gym")

        settings = get_settings()
        if not settings.cloudinary_cloud_name or not settings.cloudinary_api_key or not settings.cloudinary_api_secret:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Cloudinary is not configured")

        timestamp = int(time.time())
        folder = f"{settings.cloudinary_upload_folder.rstrip('/')}/{slug}"
        safe_name = self._slugify_filename(payload.fileName)
        public_id = f"{safe_name}-{timestamp}"
        sign_string = f"folder={folder}&public_id={public_id}&timestamp={timestamp}{settings.cloudinary_api_secret}"
        signature = hashlib.sha1(sign_string.encode("utf-8")).hexdigest()
        return TenantLogoUploadSignResponse(
            cloudName=settings.cloudinary_cloud_name,
            apiKey=settings.cloudinary_api_key,
            timestamp=timestamp,
            folder=folder,
            publicId=public_id,
            signature=signature,
        )

    def update_logo(self, *, actor: dict, slug: str, payload: TenantLogoUpdateRequest) -> TenantBrandingResponse:
        gym, branding = self.repo.get_tenant_by_slug(slug)
        if not gym:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
        if str(actor.get("gym_id") or "") != str(gym.get("_id")):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden for current gym")
        self.repo.update_gym_logo(gym["_id"], payload.logoUrl.strip())
        return TenantBrandingResponse(
            gymId=str(gym["_id"]),
            slug=gym["slug"],
            name=gym["name"],
            logo=payload.logoUrl.strip(),
            tagline=(branding or {}).get("tagline", gym.get("tagline")),
            brandColor=(branding or {}).get("brand_color"),
        )

    def update_pricing(self, *, actor: dict, slug: str, payload: TenantPricingUpdateRequest) -> TenantPricingResponse:
        gym, _ = self.repo.get_tenant_by_slug(slug)
        if not gym:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
        if str(actor.get("gym_id") or "") != str(gym.get("_id")):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden for current gym")
        if payload.monthly <= 0 or payload.quarterly <= 0 or payload.halfYearly <= 0:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="All plan prices must be positive")
        pricing_doc = {
            "monthly": float(payload.monthly),
            "quarterly": float(payload.quarterly),
            "half_yearly": float(payload.halfYearly),
        }
        self.repo.update_gym_pricing(gym["_id"], pricing_doc)
        return TenantPricingResponse(
            gymId=str(gym["_id"]),
            slug=gym["slug"],
            planPricing=TenantPlanPricing(
                monthly=pricing_doc["monthly"],
                quarterly=pricing_doc["quarterly"],
                halfYearly=pricing_doc["half_yearly"],
            ),
        )

