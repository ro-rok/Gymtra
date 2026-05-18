from bson import ObjectId
from pymongo.database import Database


class MemberRemindersRepository:
    WATER_GOAL_LITERS = 3.0

    def __init__(self, db: Database):
        self.db = db

    def list_gyms_with_timezones(self) -> list[dict]:
        return list(
            self.db.gyms.find(
                {},
                {"_id": 1, "timezone": 1, "name": 1},
            )
        )

    def list_eligible_members(self, *, gym_id: ObjectId) -> list[dict]:
        members = list(
            self.db.users.find(
                {"gym_id": gym_id, "role": "member", "status": {"$ne": "inactive"}},
                {"_id": 1, "gym_id": 1, "name": 1},
            )
        )
        if not members:
            return []
        member_ids = [m["_id"] for m in members]
        profiles = {
            str(p["user_id"]): p
            for p in self.db.member_profiles.find({"gym_id": gym_id, "user_id": {"$in": member_ids}})
        }
        subs_by_user: dict[str, list] = {}
        for sub in self.db.push_subscriptions.find({"gym_id": str(gym_id), "active": True, "user_id": {"$in": [str(i) for i in member_ids]}}):
            uid = sub.get("user_id")
            if uid:
                subs_by_user.setdefault(uid, []).append(sub)
        eligible = []
        for member in members:
            uid = str(member["_id"])
            if uid not in subs_by_user:
                continue
            profile = profiles.get(uid, {})
            prefs = profile.get("reminder_preferences") or {}
            if not prefs.get("push_enabled", True):
                continue
            eligible.append(
                {
                    "user_id": uid,
                    "gym_id": str(gym_id),
                    "name": member.get("name", "Member"),
                    "reminder_preferences": prefs,
                }
            )
        return eligible

    def get_daily_task(self, *, gym_id: str, member_id: str, day_key: str) -> dict | None:
        if not ObjectId.is_valid(gym_id) or not ObjectId.is_valid(member_id):
            return None
        return self.db.daily_tasks.find_one(
            {"gym_id": ObjectId(gym_id), "member_id": ObjectId(member_id), "day_key": day_key}
        )
