from datetime import datetime, timezone

from bson import ObjectId
from pymongo.database import Database


class AdminGymsRepository:
    def __init__(self, db: Database):
        self.db = db

    def list_gyms(self) -> list[dict]:
        return list(self.db.gyms.find({}).sort("created_at", -1))

    def get_gym(self, gym_id: ObjectId) -> dict | None:
        return self.db.gyms.find_one({"_id": gym_id})

    def get_by_slug(self, slug: str) -> dict | None:
        return self.db.gyms.find_one({"slug": slug})

    def get_global_user_by_email(self, email: str) -> dict | None:
        return self.db.users.find_one({"email": email.lower().strip()})

    def create_gym(self, payload: dict) -> dict:
        now = datetime.now(timezone.utc)
        doc = {
            "slug": payload["slug"],
            "name": payload["name"],
            "city": payload["city"],
            "tagline": payload.get("tagline"),
            "logo": payload.get("logo"),
            "members_count": 0,
            "is_active": payload.get("is_active", True),
            "seat_count": payload.get("seat_count", 5),
            "owner_user_id": payload.get("owner_user_id"),
            "admin_user_id": payload.get("admin_user_id"),
            "created_at": now,
            "updated_at": now,
        }
        self.db.gyms.insert_one(doc)
        return doc

    def create_owner_user(self, payload: dict) -> dict:
        now = datetime.now(timezone.utc)
        doc = {
            "email": payload["email"],
            "name": payload["name"],
            "phone": payload.get("phone"),
            "password_hash": payload["password_hash"],
            "role": "owner",
            "gym_id": payload["gym_id"],
            "status": "active",
            "created_at": now,
            "updated_at": now,
        }
        self.db.users.insert_one(doc)
        return doc

    def update_gym(self, gym_id: ObjectId, update_data: dict) -> dict | None:
        update_data["updated_at"] = datetime.now(timezone.utc)
        self.db.gyms.update_one({"_id": gym_id}, {"$set": update_data})
        return self.get_gym(gym_id)

    def upsert_branding(self, gym_id: ObjectId, update_data: dict) -> None:
        now = datetime.now(timezone.utc)
        if not update_data:
            return
        self.db.tenant_branding.update_one(
            {"gym_id": gym_id},
            {"$set": {**update_data, "updated_at": now}, "$setOnInsert": {"created_at": now}},
            upsert=True,
        )

    def get_branding(self, gym_id: ObjectId) -> dict | None:
        return self.db.tenant_branding.find_one({"gym_id": gym_id})
