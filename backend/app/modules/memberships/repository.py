from datetime import datetime, timezone

from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.database import Database


class MembershipsRepository:
    def __init__(self, db: Database):
        self.db = db

    def get_member(self, member_id: ObjectId, gym_id: ObjectId) -> dict | None:
        return self.db.users.find_one({"_id": member_id, "gym_id": gym_id, "role": "member"})

    def get_membership(self, membership_id: ObjectId, gym_id: ObjectId) -> dict | None:
        return self.db.memberships.find_one({"_id": membership_id, "gym_id": gym_id})

    def expire_active_memberships(self, member_id: ObjectId, gym_id: ObjectId) -> None:
        self.db.memberships.update_many(
            {"user_id": member_id, "gym_id": gym_id, "status": {"$in": ["active", "pending_renewal"]}},
            {"$set": {"status": "expired", "updated_at": datetime.now(timezone.utc)}},
        )

    def create_membership(self, payload: dict) -> dict:
        now = datetime.now(timezone.utc)
        result = self.db.memberships.insert_one({**payload, "created_at": now, "updated_at": now})
        return self.db.memberships.find_one({"_id": result.inserted_id})

    def list_memberships(self, gym_id: ObjectId, status_filter: str | None, expiring_only: bool, expired_only: bool) -> list[dict]:
        criteria: dict = {"gym_id": gym_id}
        if status_filter:
            criteria["status"] = status_filter
        now = datetime.now(timezone.utc)
        if expiring_only:
            end = now.replace(hour=23, minute=59, second=59, microsecond=0)
            criteria["end_date"] = {"$gte": now, "$lte": end.replace(day=min(end.day + 14, 28))}
        if expired_only:
            criteria["end_date"] = {"$lt": now}
        return list(self.db.memberships.find(criteria).sort("created_at", -1))

    def update_member_status(self, member_id: ObjectId, gym_id: ObjectId, status_value: str) -> dict | None:
        return self.db.users.find_one_and_update(
            {"_id": member_id, "gym_id": gym_id, "role": "member"},
            {"$set": {"status": status_value, "updated_at": datetime.now(timezone.utc)}},
            return_document=ReturnDocument.AFTER,
        )
