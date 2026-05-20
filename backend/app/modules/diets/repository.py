from datetime import datetime, timezone

from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.database import Database


class DietsRepository:
    def __init__(self, db: Database):
        self.db = db

    def create_template(self, payload: dict) -> dict:
        now = datetime.now(timezone.utc)
        row = {**payload, "created_at": now, "updated_at": now}
        result = self.db.diet_templates.insert_one(row)
        return self.db.diet_templates.find_one({"_id": result.inserted_id})

    def update_template(self, template_id: ObjectId, gym_id: ObjectId, payload: dict) -> dict | None:
        return self.db.diet_templates.find_one_and_update(
            {"_id": template_id, "gym_id": gym_id},
            {"$set": {**payload, "updated_at": datetime.now(timezone.utc)}},
            return_document=ReturnDocument.AFTER,
        )

    def get_template(self, template_id: ObjectId, gym_id: ObjectId) -> dict | None:
        return self.db.diet_templates.find_one({"_id": template_id, "gym_id": gym_id})

    def list_templates(self, gym_id: ObjectId) -> list[dict]:
        return list(self.db.diet_templates.find({"gym_id": gym_id}).sort("updated_at", -1))

    def list_templates_for_goal_week(self, gym_id: ObjectId, goal: str) -> list[dict]:
        return list(
            self.db.diet_templates.find({"gym_id": gym_id, "goal": goal, "weekday": {"$exists": True}}).sort(
                "weekday", 1
            )
        )

    def get_template_for_day(self, gym_id: ObjectId, goal: str, weekday: int) -> dict | None:
        return self.db.diet_templates.find_one({"gym_id": gym_id, "goal": goal, "weekday": weekday})

    def upsert_template_by_day_goal(self, gym_id: ObjectId, weekday: int, goal: str, payload: dict) -> dict:
        now = datetime.now(timezone.utc)
        return self.db.diet_templates.find_one_and_update(
            {"gym_id": gym_id, "weekday": weekday, "goal": goal},
            {
                "$set": {**payload, "gym_id": gym_id, "weekday": weekday, "goal": goal, "updated_at": now},
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

    def deactivate_member_assignments(self, member_id: ObjectId, gym_id: ObjectId) -> None:
        self.db.member_diet_assignments.update_many(
            {"member_id": member_id, "gym_id": gym_id, "active": True},
            {"$set": {"active": False, "updated_at": datetime.now(timezone.utc)}},
        )

    def create_assignment(self, payload: dict) -> dict:
        now = datetime.now(timezone.utc)
        row = {**payload, "created_at": now, "updated_at": now}
        result = self.db.member_diet_assignments.insert_one(row)
        return self.db.member_diet_assignments.find_one({"_id": result.inserted_id})

    def get_active_assignment(self, member_id: ObjectId, gym_id: ObjectId) -> dict | None:
        return self.db.member_diet_assignments.find_one(
            {"member_id": member_id, "gym_id": gym_id, "active": True},
            sort=[("assigned_at", -1)],
        )

    def upsert_meal_check(
        self,
        *,
        gym_id: ObjectId,
        member_id: ObjectId,
        day_key: str,
        meal_index: int,
        consumed: bool,
    ) -> dict:
        now = datetime.now(timezone.utc)
        return self.db.diet_meal_logs.find_one_and_update(
            {
                "gym_id": gym_id,
                "member_id": member_id,
                "day_key": day_key,
                "meal_index": meal_index,
                "entry_type": "template",
            },
            {
                "$set": {"consumed": consumed, "updated_at": now},
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )

    def add_custom_meal(
        self,
        *,
        gym_id: ObjectId,
        member_id: ObjectId,
        day_key: str,
        payload: dict,
    ) -> dict:
        now = datetime.now(timezone.utc)
        row = {
            "gym_id": gym_id,
            "member_id": member_id,
            "day_key": day_key,
            "entry_type": "custom",
            **payload,
            "consumed": True,
            "created_at": now,
            "updated_at": now,
        }
        result = self.db.diet_meal_logs.insert_one(row)
        return self.db.diet_meal_logs.find_one({"_id": result.inserted_id}) or row

    def delete_custom_meal(
        self,
        *,
        gym_id: ObjectId,
        member_id: ObjectId,
        day_key: str,
        meal_id: ObjectId,
    ) -> bool:
        result = self.db.diet_meal_logs.delete_one(
            {
                "_id": meal_id,
                "gym_id": gym_id,
                "member_id": member_id,
                "day_key": day_key,
                "entry_type": "custom",
            }
        )
        return result.deleted_count > 0

    def list_meal_logs_for_day(self, *, gym_id: ObjectId, member_id: ObjectId, day_key: str) -> list[dict]:
        return list(
            self.db.diet_meal_logs.find({"gym_id": gym_id, "member_id": member_id, "day_key": day_key}).sort(
                [("entry_type", 1), ("meal_index", 1), ("created_at", 1)]
            )
        )

    def aggregate_macro_series_for_month(self, *, gym_id: ObjectId, member_id: ObjectId, month: str) -> list[dict]:
        pipeline = [
            {
                "$match": {
                    "gym_id": gym_id,
                    "member_id": member_id,
                    "day_key": {"$regex": f"^{month}-"},
                    "consumed": True,
                }
            },
            {
                "$group": {
                    "_id": "$day_key",
                    "calories": {"$sum": {"$ifNull": ["$calories", 0]}},
                    "protein": {"$sum": {"$ifNull": ["$protein", 0]}},
                    "carbs": {"$sum": {"$ifNull": ["$carbs", 0]}},
                    "fat": {"$sum": {"$ifNull": ["$fat", 0]}},
                }
            },
            {"$sort": {"_id": 1}},
        ]
        return list(self.db.diet_meal_logs.aggregate(pipeline))

