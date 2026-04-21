from pymongo.database import Database


class PublicRepository:
    def __init__(self, db: Database):
        self.db = db

    def list_public_gyms(self):
        return list(self.db.gyms.find({"is_active": True}).sort("name", 1))

    def get_gym_by_slug(self, slug: str):
        return self.db.gyms.find_one({"slug": slug, "is_active": True})

    def get_branding_by_gym_id(self, gym_id):
        return self.db.tenant_branding.find_one({"gym_id": gym_id})

