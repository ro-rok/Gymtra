from datetime import datetime, timezone

from bson import ObjectId
from pymongo.database import Database


class AdminSubscriptionsRepository:
    def __init__(self, db: Database):
        self.db = db

    def list_subscriptions(self) -> list[dict]:
        return list(self.db.subscriptions.find({}).sort("updated_at", -1))

    def get_by_gym_id(self, gym_id: ObjectId) -> dict | None:
        return self.db.subscriptions.find_one({"gym_id": gym_id})

    def upsert_by_gym_id(self, gym_id: ObjectId, payload: dict) -> dict:
        now = datetime.now(timezone.utc)
        self.db.subscriptions.update_one(
            {"gym_id": gym_id},
            {"$set": {**payload, "updated_at": now}, "$setOnInsert": {"created_at": now}},
            upsert=True,
        )
        return self.get_by_gym_id(gym_id) or {}
