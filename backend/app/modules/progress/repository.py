from datetime import datetime, timezone

from bson import ObjectId
from pymongo.database import Database


class ProgressRepository:
    def __init__(self, db: Database):
        self.db = db

    def create_log(self, payload: dict) -> dict:
        now = datetime.now(timezone.utc)
        row = {**payload, "created_at": now, "updated_at": now}
        result = self.db.progress_logs.insert_one(row)
        return self.db.progress_logs.find_one({"_id": result.inserted_id})

    def list_logs(self, gym_id: ObjectId, member_id: ObjectId) -> list[dict]:
        return list(self.db.progress_logs.find({"gym_id": gym_id, "member_id": member_id}).sort("log_date", 1))

