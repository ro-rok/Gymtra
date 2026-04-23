from pymongo.database import Database


class TenantsRepository:
    def __init__(self, db: Database):
        self.db = db

    def get_tenant_by_slug(self, slug: str):
        gym = self.db.gyms.find_one({"slug": slug, "is_active": True})
        if not gym:
            return None, None
        branding = self.db.tenant_branding.find_one({"gym_id": gym["_id"]})
        return gym, branding

    def update_gym_logo(self, gym_id, logo_url: str) -> None:
        self.db.gyms.update_one({"_id": gym_id}, {"$set": {"logo": logo_url}})

    def update_gym_pricing(self, gym_id, pricing: dict) -> None:
        self.db.gyms.update_one({"_id": gym_id}, {"$set": {"membership_pricing": pricing}})

