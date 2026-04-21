from datetime import datetime, timedelta, timezone

from bson import ObjectId
from pymongo.database import Database


class RemindersRepository:
    def __init__(self, db: Database):
        self.db = db

    def list_members(self, gym_id: ObjectId) -> list[dict]:
        return list(self.db.users.find({"gym_id": gym_id, "role": "member", "status": "active"}))

    def list_memberships(self, gym_id: ObjectId) -> list[dict]:
        return list(self.db.memberships.find({"gym_id": gym_id}))

    def list_recent_attendance(self, gym_id: ObjectId, days: int = 30) -> list[dict]:
        start_day = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
        return list(self.db.attendance.find({"gym_id": gym_id, "day_key": {"$gte": start_day}}))

    def list_notification_logs(self, gym_id: str, limit: int = 100) -> list[dict]:
        return list(self.db.notification_logs.find({"gym_id": gym_id}).sort("created_at", -1).limit(limit))

    def create_log(self, payload: dict) -> None:
        self.db.notification_logs.insert_one({**payload, "created_at": datetime.now(timezone.utc)})
