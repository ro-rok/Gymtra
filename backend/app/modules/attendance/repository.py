from datetime import datetime, timezone

from bson import ObjectId
from pymongo.database import Database


class AttendanceRepository:
    def __init__(self, db: Database):
        self.db = db

    def upsert_attendance(
        self,
        *,
        gym_id: ObjectId,
        member_id: ObjectId,
        day_key: str,
        status: str,
        marked_by: ObjectId,
        source: str,
        trust_level: str,
    ) -> dict:
        now = datetime.now(timezone.utc)
        self.db.attendance.update_one(
            {"gym_id": gym_id, "member_id": member_id, "day_key": day_key},
            {
                "$set": {
                    "status": status,
                    "marked_by": marked_by,
                    "source": source,
                    "trust_level": trust_level,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "gym_id": gym_id,
                    "member_id": member_id,
                    "day_key": day_key,
                    "created_at": now,
                },
            },
            upsert=True,
        )
        return self.db.attendance.find_one({"gym_id": gym_id, "member_id": member_id, "day_key": day_key}) or {}

    def get_attendance(self, *, gym_id: ObjectId, member_id: ObjectId, day_key: str) -> dict | None:
        return self.db.attendance.find_one({"gym_id": gym_id, "member_id": member_id, "day_key": day_key})

    def count_attendance_records(self, *, gym_id: ObjectId, member_id: ObjectId, day_key: str) -> int:
        return self.db.attendance.count_documents({"gym_id": gym_id, "member_id": member_id, "day_key": day_key})

    def get_attendance_for_day(self, *, gym_id: ObjectId, day_key: str) -> list[dict]:
        return list(self.db.attendance.find({"gym_id": gym_id, "day_key": day_key}))

    def get_member_attendance(self, *, gym_id: ObjectId, member_id: ObjectId, limit: int = 90) -> list[dict]:
        return list(
            self.db.attendance.find({"gym_id": gym_id, "member_id": member_id}).sort("day_key", -1).limit(limit)
        )

    def count_present_sessions(self, *, gym_id: ObjectId, member_id: ObjectId) -> int:
        return self.db.attendance.count_documents(
            {"gym_id": gym_id, "member_id": member_id, "status": "present"}
        )

    def upsert_daily_task(
        self,
        *,
        gym_id: ObjectId,
        member_id: ObjectId,
        day_key: str,
        workout: bool,
        meal: bool,
        water: bool,
        water_liters: float,
        meal_breakfast: bool = False,
        meal_lunch: bool = False,
        meal_dinner: bool = False,
    ) -> dict:
        now = datetime.now(timezone.utc)
        meal_complete = meal or meal_breakfast or meal_lunch or meal_dinner
        self.db.daily_tasks.update_one(
            {"gym_id": gym_id, "member_id": member_id, "day_key": day_key},
            {
                "$set": {
                    "workout": workout,
                    "meal": meal_complete,
                    "meal_breakfast": meal_breakfast,
                    "meal_lunch": meal_lunch,
                    "meal_dinner": meal_dinner,
                    "water": water,
                    "water_liters": water_liters,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "gym_id": gym_id,
                    "member_id": member_id,
                    "day_key": day_key,
                    "created_at": now,
                },
            },
            upsert=True,
        )
        return self.db.daily_tasks.find_one({"gym_id": gym_id, "member_id": member_id, "day_key": day_key}) or {}

    def get_daily_task(self, *, gym_id: ObjectId, member_id: ObjectId, day_key: str) -> dict | None:
        return self.db.daily_tasks.find_one({"gym_id": gym_id, "member_id": member_id, "day_key": day_key})

    def get_daily_tasks_for_member(self, *, gym_id: ObjectId, member_id: ObjectId, limit: int = 90) -> list[dict]:
        return list(
            self.db.daily_tasks.find({"gym_id": gym_id, "member_id": member_id}).sort("day_key", -1).limit(limit)
        )

    def consume_qr_nonce(self, *, gym_id: ObjectId, nonce: str, expires_at: datetime) -> bool:
        now = datetime.now(timezone.utc)
        result = self.db.qr_nonce_consumptions.update_one(
            {"gym_id": gym_id, "nonce": nonce},
            {
                "$setOnInsert": {
                    "gym_id": gym_id,
                    "nonce": nonce,
                    "created_at": now,
                    "expires_at": expires_at,
                }
            },
            upsert=True,
        )
        return result.upserted_id is not None

