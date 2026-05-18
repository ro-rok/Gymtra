from datetime import datetime, timedelta, timezone

from bson import ObjectId
from pymongo.database import Database


class AnalyticsRepository:
    def __init__(self, db: Database):
        self.db = db

    PLATFORM_GYM_KEY = "__platform__"

    def get_cache(self, *, key: str, gym_id: str | None) -> dict | None:
        cache_gym_id = gym_id if gym_id is not None else self.PLATFORM_GYM_KEY
        return self.db.analytics_cache.find_one(
            {"key": key, "gym_id": cache_gym_id, "expires_at": {"$gt": datetime.now(timezone.utc)}}
        )

    def set_cache(self, *, key: str, gym_id: str | None, payload: dict, ttl_minutes: int = 10) -> None:
        cache_gym_id = gym_id if gym_id is not None else self.PLATFORM_GYM_KEY
        expires = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)
        self.db.analytics_cache.update_one(
            {"key": key, "gym_id": cache_gym_id},
            {"$set": {"payload": payload, "expires_at": expires, "updated_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
