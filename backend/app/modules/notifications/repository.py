from datetime import datetime, timedelta, timezone

from pymongo.database import Database


class NotificationsRepository:
    def __init__(self, db: Database):
        self.db = db

    def upsert_push_subscription(self, data: dict):
        now = datetime.now(timezone.utc)
        self.db.push_subscriptions.update_one(
            {"endpoint": data["endpoint"]},
            {
                "$set": {
                    **data,
                    "updated_at": now,
                    "active": True,
                },
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )

    def deactivate_push_subscription(self, endpoint: str):
        self.db.push_subscriptions.update_one(
            {"endpoint": endpoint},
            {"$set": {"active": False, "updated_at": datetime.now(timezone.utc)}},
        )

    def get_active_subscriptions(self, *, gym_id: str | None = None, user_id: str | None = None) -> list[dict]:
        query: dict = {"active": True}
        if gym_id is not None:
            query["gym_id"] = gym_id
        if user_id is not None:
            query["user_id"] = user_id
        return list(self.db.push_subscriptions.find(query))

    def create_notification_log(self, payload: dict):
        self.db.notification_logs.insert_one({**payload, "created_at": datetime.now(timezone.utc)})

    def has_recent_event(self, *, gym_id: str, user_id: str, event_type: str, cooldown_hours: int = 24) -> bool:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=cooldown_hours)
        item = self.db.notification_logs.find_one(
            {
                "gym_id": gym_id,
                "user_id": user_id,
                "event_type": event_type,
                "created_at": {"$gte": cutoff},
                "status": "sent",
            }
        )
        return item is not None

