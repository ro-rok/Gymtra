from datetime import datetime, timezone

from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.database import Database


class MemberProfilesRepository:
    def __init__(self, db: Database):
        self.db = db

    def create_member_user(self, payload: dict) -> dict:
        now = datetime.now(timezone.utc)
        payload = {**payload, "role": "member", "status": "active", "created_at": now, "updated_at": now}
        result = self.db.users.insert_one(payload)
        return self.db.users.find_one({"_id": result.inserted_id})

    def update_member_user(self, member_id: ObjectId, gym_id: ObjectId, payload: dict) -> dict | None:
        payload = {**payload, "updated_at": datetime.now(timezone.utc)}
        return self.db.users.find_one_and_update(
            {"_id": member_id, "gym_id": gym_id, "role": "member"},
            {"$set": payload},
            return_document=ReturnDocument.AFTER,
        )

    def get_member_user(self, member_id: ObjectId, gym_id: ObjectId) -> dict | None:
        return self.db.users.find_one({"_id": member_id, "gym_id": gym_id, "role": "member"})

    def get_member_by_email(self, email: str, gym_id: ObjectId) -> dict | None:
        return self.db.users.find_one({"email": email.lower().strip(), "gym_id": gym_id, "role": "member"})

    def list_members(self, gym_id: ObjectId, query: str | None, status: str | None) -> list[dict]:
        criteria: dict = {"gym_id": gym_id, "role": "member"}
        if status:
            criteria["status"] = status
        if query:
            q = query.strip()
            criteria["$or"] = [
                {"name": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}},
                {"phone": {"$regex": q, "$options": "i"}},
            ]
        return list(self.db.users.find(criteria).sort("created_at", -1))

    def upsert_profile(self, member_id: ObjectId, gym_id: ObjectId, profile_payload: dict) -> dict:
        now = datetime.now(timezone.utc)
        return self.db.member_profiles.find_one_and_update(
            {"user_id": member_id, "gym_id": gym_id},
            {"$set": {**profile_payload, "updated_at": now}, "$setOnInsert": {"created_at": now}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

    def get_profile(self, member_id: ObjectId, gym_id: ObjectId) -> dict | None:
        return self.db.member_profiles.find_one({"user_id": member_id, "gym_id": gym_id})

    def get_profiles_by_member_ids(self, gym_id: ObjectId, member_ids: list[ObjectId]) -> dict[str, dict]:
        rows = self.db.member_profiles.find({"gym_id": gym_id, "user_id": {"$in": member_ids}})
        return {str(row["user_id"]): row for row in rows}

    def get_latest_membership(self, member_id: ObjectId, gym_id: ObjectId) -> dict | None:
        return self.db.memberships.find_one({"user_id": member_id, "gym_id": gym_id}, sort=[("created_at", -1)])

    def update_reminder_preferences(self, member_id: ObjectId, gym_id: ObjectId, preferences: dict) -> dict:
        now = datetime.now(timezone.utc)
        return self.db.member_profiles.find_one_and_update(
            {"user_id": member_id, "gym_id": gym_id},
            {
                "$set": {"reminder_preferences": preferences, "updated_at": now},
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

    def get_latest_memberships_by_member_ids(self, gym_id: ObjectId, member_ids: list[ObjectId]) -> dict[str, dict]:
        rows = list(
            self.db.memberships.find({"gym_id": gym_id, "user_id": {"$in": member_ids}}).sort(
                [("user_id", 1), ("created_at", -1)]
            )
        )
        latest: dict[str, dict] = {}
        for row in rows:
            key = str(row["user_id"])
            if key not in latest:
                latest[key] = row
        return latest
