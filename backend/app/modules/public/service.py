from app.modules.public.repository import PublicRepository
from app.modules.public.schemas import PublicGymDetail, PublicGymSummary


class PublicService:
    def __init__(self, repo: PublicRepository):
        self.repo = repo

    def list_gyms(self) -> list[PublicGymSummary]:
        gyms = self.repo.list_public_gyms()
        return [self._to_summary(item) for item in gyms]

    def get_gym(self, slug: str) -> PublicGymDetail | None:
        gym = self.repo.get_gym_by_slug(slug)
        if not gym:
            return None
        branding = self.repo.get_branding_by_gym_id(gym["_id"]) or {}
        summary = self._to_summary(gym)
        return PublicGymDetail(
            **summary.model_dump(),
            brandColor=branding.get("brand_color"),
            metaTitle=branding.get("meta_title"),
            metaDescription=branding.get("meta_description"),
        )

    @staticmethod
    def _to_summary(doc) -> PublicGymSummary:
        return PublicGymSummary(
            id=str(doc["_id"]),
            slug=doc["slug"],
            name=doc["name"],
            logo=doc.get("logo"),
            city=doc.get("city", ""),
            members=int(doc.get("members_count", 0)),
            tagline=doc.get("tagline"),
            isActive=bool(doc.get("is_active", False)),
            createdAt=doc.get("created_at").isoformat() if doc.get("created_at") else "",
        )

