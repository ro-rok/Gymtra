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

