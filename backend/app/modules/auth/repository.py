from bson import ObjectId
from pymongo.database import Database


class AuthRepository:
    def __init__(self, db: Database):
        self.db = db

    def get_user_by_email(self, email: str, *, gym_id: ObjectId | None = None, role: str | None = None):
        query: dict = {"email": email.lower().strip()}
        if gym_id is not None:
            query["gym_id"] = gym_id
        if role is not None:
            query["role"] = role
        return self.db.users.find_one(query)

    def get_user_by_id(self, user_id: str, *, gym_id: ObjectId | None = None):
        if not ObjectId.is_valid(user_id):
            return None
        query: dict = {"_id": ObjectId(user_id)}
        if gym_id is not None:
            query["gym_id"] = gym_id
        return self.db.users.find_one(query)

    def create_refresh_token(self, payload: dict) -> None:
        self.db.refresh_tokens.insert_one(payload)

    def get_refresh_token(self, token_hash: str) -> dict | None:
        return self.db.refresh_tokens.find_one({"token_hash": token_hash})

    def revoke_refresh_token(self, token_hash: str, *, reason: str = "manual") -> None:
        self.db.refresh_tokens.update_one(
            {"token_hash": token_hash},
            {"$set": {"status": "revoked", "revoked_at": self._now(), "revoked_reason": reason}},
        )

    def revoke_all_refresh_tokens_for_user(self, user_id: ObjectId, *, reason: str = "manual") -> None:
        self.db.refresh_tokens.update_many(
            {"user_id": user_id, "status": {"$ne": "revoked"}},
            {"$set": {"status": "revoked", "revoked_at": self._now(), "revoked_reason": reason}},
        )

    def mark_refresh_reuse_event(self, *, token_hash: str, user_id: ObjectId | None, reason: str = "reuse_detected") -> None:
        self.db.refresh_token_events.insert_one(
            {
                "token_hash": token_hash,
                "user_id": user_id,
                "reason": reason,
                "created_at": self._now(),
            }
        )

    @staticmethod
    def _now():
        from datetime import datetime, timezone

        return datetime.now(timezone.utc)

