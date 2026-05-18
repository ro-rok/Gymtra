from datetime import datetime, timedelta, timezone

from pymongo.database import Database


class NotificationsRepository:
    def __init__(self, db: Database):
        self.db = db

    def upsert_push_subscription(self, data: dict):
        now = datetime.now(timezone.utc)
        self.db.push_subscriptions.update_one(
            {
                "endpoint": data["endpoint"],
                "user_id": data["user_id"],
                "gym_id": data.get("gym_id"),
            },
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

    def deactivate_push_subscription(self, endpoint: str, *, user_id: str, gym_id: str | None):
        self.db.push_subscriptions.update_one(
            {"endpoint": endpoint, "user_id": user_id, "gym_id": gym_id},
            {"$set": {"active": False, "updated_at": datetime.now(timezone.utc)}},
        )

    def deactivate_push_subscription_by_endpoint(self, endpoint: str, *, reason: str = "stale_endpoint") -> None:
        self.db.push_subscriptions.update_many(
            {"endpoint": endpoint},
            {"$set": {"active": False, "deactivated_reason": reason, "updated_at": datetime.now(timezone.utc)}},
        )

    def deactivate_all_push_subscriptions_for_user(self, *, user_id: str, gym_id: str | None):
        query: dict = {"user_id": user_id}
        if gym_id is not None:
            query["gym_id"] = gym_id
        self.db.push_subscriptions.update_many(
            query,
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

    def has_sent_dedupe_key(self, *, gym_id: str, user_id: str, dedupe_key: str) -> bool:
        item = self.db.notification_logs.find_one(
            {
                "gym_id": gym_id,
                "user_id": user_id,
                "event_type": dedupe_key,
                "status": "sent",
            }
        )
        return item is not None

