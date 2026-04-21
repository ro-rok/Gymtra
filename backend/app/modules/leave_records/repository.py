from datetime import datetime, timezone

from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.database import Database


class LeaveRecordsRepository:
    def __init__(self, db: Database):
        self.db = db

    def list_records(self, gym_id: ObjectId) -> list[dict]:
        return list(self.db.leave_records.find({"gym_id": gym_id}).sort("leave_date", -1))

    def create_record(self, payload: dict) -> dict:
        now = datetime.now(timezone.utc)
        row = {**payload, "created_at": now, "updated_at": now}
        result = self.db.leave_records.insert_one(row)
        return self.db.leave_records.find_one({"_id": result.inserted_id})

    def update_record(self, record_id: ObjectId, gym_id: ObjectId, payload: dict) -> dict | None:
        return self.db.leave_records.find_one_and_update(
            {"_id": record_id, "gym_id": gym_id},
            {"$set": {**payload, "updated_at": datetime.now(timezone.utc)}},
            return_document=ReturnDocument.AFTER,
        )

