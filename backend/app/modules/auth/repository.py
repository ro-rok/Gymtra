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

    def get_user_by_phone(self, phone: str, *, gym_id: ObjectId | None = None, role: str | None = None):
        query: dict = {"phone": phone.strip()}
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

    def update_user_password(self, *, user_id: ObjectId, password_hash: str, must_change_password: bool) -> None:
        self.db.users.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "password_hash": password_hash,
                    "must_change_password": must_change_password,
                    "updated_at": self._now(),
                }
            },
        )

    def create_password_reset_request(self, payload: dict) -> dict:
        result = self.db.password_reset_requests.insert_one(payload)
        return self.db.password_reset_requests.find_one({"_id": result.inserted_id}) or payload

    def create_owner_password_reset_token(self, payload: dict) -> dict:
        result = self.db.owner_password_reset_tokens.insert_one(payload)
        return self.db.owner_password_reset_tokens.find_one({"_id": result.inserted_id}) or payload

    def get_owner_password_reset_token(self, token_hash: str) -> dict | None:
        return self.db.owner_password_reset_tokens.find_one({"token_hash": token_hash})

    def revoke_owner_password_reset_tokens_for_user(self, *, user_id: ObjectId, reason: str = "superseded") -> None:
        self.db.owner_password_reset_tokens.update_many(
            {"user_id": user_id, "status": "active"},
            {"$set": {"status": "revoked", "revoked_reason": reason, "updated_at": self._now()}},
        )

    def mark_owner_password_reset_token_used(self, *, token_hash: str) -> None:
        self.db.owner_password_reset_tokens.update_one(
            {"token_hash": token_hash, "status": "active"},
            {"$set": {"status": "used", "used_at": self._now(), "updated_at": self._now()}},
        )

    def create_owner_password_reset_request(self, payload: dict) -> dict:
        result = self.db.owner_password_reset_requests.insert_one(payload)
        return self.db.owner_password_reset_requests.find_one({"_id": result.inserted_id}) or payload

    def get_pending_owner_password_reset_request(self, *, owner_id: ObjectId, gym_id: ObjectId) -> dict | None:
        return self.db.owner_password_reset_requests.find_one(
            {"owner_id": owner_id, "gym_id": gym_id, "status": "pending"},
            sort=[("created_at", -1)],
        )

    def list_owner_password_reset_requests(self, *, status: str = "pending") -> list[dict]:
        return list(self.db.owner_password_reset_requests.find({"status": status}).sort("created_at", -1))

    def get_owner_password_reset_request_by_id(self, request_id: ObjectId) -> dict | None:
        return self.db.owner_password_reset_requests.find_one({"_id": request_id})

    def update_owner_password_reset_request(self, *, request_id: ObjectId, payload: dict) -> dict | None:
        from pymongo import ReturnDocument

        return self.db.owner_password_reset_requests.find_one_and_update(
            {"_id": request_id},
            {"$set": payload},
            return_document=ReturnDocument.AFTER,
        )

    def get_password_reset_request(self, request_id: ObjectId) -> dict | None:
        return self.db.password_reset_requests.find_one({"_id": request_id})

    def list_password_reset_requests(self, *, gym_id: ObjectId, status: str = "pending") -> list[dict]:
        return list(self.db.password_reset_requests.find({"gym_id": gym_id, "status": status}).sort("created_at", -1))

    def update_password_reset_request(self, *, request_id: ObjectId, payload: dict) -> dict | None:
        from pymongo import ReturnDocument

        return self.db.password_reset_requests.find_one_and_update(
            {"_id": request_id},
            {"$set": payload},
            return_document=ReturnDocument.AFTER,
        )

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

