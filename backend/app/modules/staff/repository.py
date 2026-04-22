from datetime import datetime, timezone

from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.database import Database


class StaffRepository:
    def __init__(self, db: Database):
        self.db = db

    def list_staff_users(self, gym_id: ObjectId) -> list[dict]:
        return list(self.db.users.find({"gym_id": gym_id, "role": {"$in": ["owner", "trainer"]}}).sort("name", 1))

    def get_user_by_email(self, gym_id: ObjectId, email: str) -> dict | None:
        return self.db.users.find_one({"gym_id": gym_id, "email": email.lower().strip()})

    def get_user_by_phone(self, gym_id: ObjectId, phone: str) -> dict | None:
        return self.db.users.find_one({"gym_id": gym_id, "phone": phone.strip()})

    def create_staff_user(self, payload: dict) -> dict:
        result = self.db.users.insert_one(payload)
        payload["_id"] = result.inserted_id
        return payload

    def upsert_staff_profile(self, gym_id: ObjectId, user_id: ObjectId, salary: float | None = None, payroll_status: str | None = None) -> dict:
        now = datetime.now(timezone.utc)
        set_payload: dict = {"updated_at": now}
        if salary is not None:
            set_payload["salary"] = salary
        if payroll_status is not None:
            set_payload["payroll_status"] = payroll_status
        return self.db.staff_profiles.find_one_and_update(
            {"gym_id": gym_id, "user_id": user_id},
            {"$set": set_payload, "$setOnInsert": {"created_at": now, "salary": 0, "payroll_status": "pending"}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

    def get_staff_profiles(self, gym_id: ObjectId, user_ids: list[ObjectId]) -> dict[str, dict]:
        rows = self.db.staff_profiles.find({"gym_id": gym_id, "user_id": {"$in": user_ids}})
        return {str(row["user_id"]): row for row in rows}

