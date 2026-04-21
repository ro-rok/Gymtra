from bson import ObjectId
from pymongo.database import Database


class AuthRepository:
    def __init__(self, db: Database):
        self.db = db

    def get_user_by_email(self, email: str):
        return self.db.users.find_one({"email": email.lower().strip()})

    def get_user_by_id(self, user_id: str):
        if not ObjectId.is_valid(user_id):
            return None
        return self.db.users.find_one({"_id": ObjectId(user_id)})

