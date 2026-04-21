from datetime import datetime, timezone

from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.database import Database


class ExpensesRepository:
    def __init__(self, db: Database):
        self.db = db

    def list_expenses(self, gym_id: ObjectId) -> list[dict]:
        return list(self.db.expenses.find({"gym_id": gym_id}).sort("expense_date", -1))

    def create_expense(self, payload: dict) -> dict:
        now = datetime.now(timezone.utc)
        row = {**payload, "created_at": now, "updated_at": now}
        result = self.db.expenses.insert_one(row)
        return self.db.expenses.find_one({"_id": result.inserted_id})

    def update_expense(self, expense_id: ObjectId, gym_id: ObjectId, payload: dict) -> dict | None:
        return self.db.expenses.find_one_and_update(
            {"_id": expense_id, "gym_id": gym_id},
            {"$set": {**payload, "updated_at": datetime.now(timezone.utc)}},
            return_document=ReturnDocument.AFTER,
        )

