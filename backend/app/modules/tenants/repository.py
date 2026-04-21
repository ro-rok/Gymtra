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

