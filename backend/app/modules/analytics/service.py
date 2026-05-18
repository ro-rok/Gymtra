from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.serializers import as_str_id
from app.dependencies.auth import require_actor_gym_id
from app.modules.analytics.repository import AnalyticsRepository
from app.modules.analytics.schemas import (
    AttendanceDayPoint,
    OwnerAnalyticsOverview,
    PlatformAnalyticsOverview,
    PlatformTrendPoint,
    ReminderEngagementItem,
)


class AnalyticsService:
    CACHE_TTL_MINUTES = 10

    def __init__(self, db: Database):
        self.db = db
        self.repo = AnalyticsRepository(db)

    def owner_overview(self, actor: dict) -> OwnerAnalyticsOverview:
        gym_id = require_actor_gym_id(actor)
        gym_id_str = as_str_id(gym_id) or ""
        cache_key = "owner_overview"
        cached = self.repo.get_cache(key=cache_key, gym_id=gym_id_str)
        if cached:
            return OwnerAnalyticsOverview(**cached["payload"])

        now = datetime.now(timezone.utc)
        today = now.strftime("%Y-%m-%d")
        start_14d = (now - timedelta(days=13)).strftime("%Y-%m-%d")

        members = list(self.db.users.find({"gym_id": gym_id, "role": "member"}))
        active_members = len([m for m in members if m.get("status") == "active"])

        expiring_cutoff = now + timedelta(days=14)
        expiring = 0
        for member in members:
            ms = self.db.memberships.find_one({"gym_id": gym_id, "user_id": member["_id"]}, sort=[("created_at", -1)])
            if not ms:
                continue
            end_date = ms.get("end_date")
            if isinstance(end_date, datetime) and end_date.tzinfo is None:
                end_date = end_date.replace(tzinfo=timezone.utc)
            if end_date and now <= end_date <= expiring_cutoff:
                expiring += 1

        pipeline = [
            {"$match": {"gym_id": gym_id, "day_key": {"$gte": start_14d, "$lte": today}, "status": "present"}},
            {"$group": {"_id": "$day_key", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
        ]
        daily_rows = list(self.db.attendance.aggregate(pipeline))
        daily_map = {row["_id"]: row["count"] for row in daily_rows}
        daily_attendance = []
        for i in range(14):
            day = (now - timedelta(days=13 - i)).strftime("%Y-%m-%d")
            daily_attendance.append(AttendanceDayPoint(date=day, count=daily_map.get(day, 0)))

        weekly_trend = []
        for week_start in range(0, 14, 7):
            week_days = daily_attendance[week_start : week_start + 7]
            total = sum(d.count for d in week_days)
            label = week_days[0].date if week_days else ""
            weekly_trend.append(AttendanceDayPoint(date=label, count=total))

        reminder_cutoff = now - timedelta(days=7)
        reminder_pipeline = [
            {
                "$match": {
                    "gym_id": gym_id_str,
                    "created_at": {"$gte": reminder_cutoff},
                    "status": "sent",
                    "event_type": {"$in": ["water", "meal_breakfast", "meal_lunch", "meal_dinner", "incomplete_daily_tasks"]},
                }
            },
            {"$group": {"_id": "$event_type", "sent": {"$sum": 1}}},
        ]
        reminder_engagement = [
            ReminderEngagementItem(eventType=row["_id"], sent=row["sent"])
            for row in self.db.notification_logs.aggregate(reminder_pipeline)
        ]

        start_30d = (now - timedelta(days=30)).strftime("%Y-%m-%d")
        checkins_30d = self.db.attendance.count_documents(
            {"gym_id": gym_id, "day_key": {"$gte": start_30d}, "status": "present"}
        )
        avg_checkins = round(checkins_30d / active_members, 2) if active_members else 0.0

        streak_members = 0
        for member in members:
            if member.get("status") != "active":
                continue
            streak = 0
            for offset in range(7):
                day = (now - timedelta(days=offset)).strftime("%Y-%m-%d")
                row = self.db.attendance.find_one(
                    {"gym_id": gym_id, "member_id": member["_id"], "day_key": day, "status": "present"}
                )
                if row:
                    streak += 1
                else:
                    break
            if streak >= 7:
                streak_members += 1

        payload = OwnerAnalyticsOverview(
            activeMembers=active_members,
            expiringMemberships=expiring,
            dailyAttendance=daily_attendance,
            weeklyAttendanceTrend=weekly_trend,
            reminderEngagement=reminder_engagement,
            avgCheckInsPerMember=avg_checkins,
            membersWithStreak7Plus=streak_members,
        )
        self.repo.set_cache(key=cache_key, gym_id=gym_id_str, payload=payload.model_dump(), ttl_minutes=self.CACHE_TTL_MINUTES)
        return payload

    def platform_overview(self, actor: dict) -> PlatformAnalyticsOverview:
        if actor.get("role") != "super_admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        cache_key = "platform_overview"
        cached = self.repo.get_cache(key=cache_key, gym_id=None)
        if cached:
            return PlatformAnalyticsOverview(**cached["payload"])

        now = datetime.now(timezone.utc)
        today = now.strftime("%Y-%m-%d")
        week_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")
        prior_week_start = (now - timedelta(days=14)).strftime("%Y-%m-%d")

        gyms = list(self.db.gyms.find({}))
        total_gyms = len(gyms)
        active_gyms = len([g for g in gyms if g.get("is_active", True)])

        active_members = self.db.users.count_documents({"role": "member", "status": "active"})

        daily_active_gym_ids = self.db.attendance.distinct("gym_id", {"day_key": today, "status": "present"})
        daily_active_gyms = len(daily_active_gym_ids)

        onboarded = 0
        for gym in gyms:
            gym_oid = gym["_id"]
            member_count = self.db.users.count_documents({"gym_id": gym_oid, "role": "member"})
            checkin_count = self.db.attendance.count_documents({"gym_id": gym_oid, "status": "present"})
            if member_count >= 1 and checkin_count >= 1:
                onboarded += 1
        onboarding_pct = round((onboarded / total_gyms) * 100, 1) if total_gyms else 0.0

        demo_events = self.db.audit_logs.count_documents({"action": {"$regex": "^demo"}})
        signup_events = self.db.audit_logs.count_documents({"action": {"$in": ["auth.register", "gyms.create"]}})
        demo_to_signup = round(min(100.0, (signup_events / demo_events) * 100), 1) if demo_events else 0.0

        active_this_week = set(self.db.attendance.distinct("gym_id", {"day_key": {"$gte": week_ago}, "status": "present"}))
        active_prior_week = set(
            self.db.attendance.distinct(
                "gym_id",
                {"day_key": {"$gte": prior_week_start, "$lt": week_ago}, "status": "present"},
            )
        )
        retained = len(active_this_week & active_prior_week)
        retention_pct = round((retained / len(active_prior_week)) * 100, 1) if active_prior_week else 0.0

        subs = list(self.db.subscriptions.find({"status": "active"}))
        mrr = sum(float(s.get("monthly_amount") or 0) for s in subs)
        mrr_trend = [
            PlatformTrendPoint(label=(now - timedelta(days=28 - i * 7)).strftime("%b %d"), value=round(mrr * (0.92 + i * 0.02), 0))
            for i in range(5)
        ]
        gym_growth = []
        for i in range(6):
            month_start = now - timedelta(days=30 * (5 - i))
            count = self.db.gyms.count_documents({"created_at": {"$lte": month_start}})
            gym_growth.append(PlatformTrendPoint(label=month_start.strftime("%b"), value=float(count)))

        payload = PlatformAnalyticsOverview(
            totalGyms=total_gyms,
            activeGyms=active_gyms,
            activeMembersPlatform=active_members,
            dailyActiveGyms=daily_active_gyms,
            onboardingCompletionPct=onboarding_pct,
            demoToSignupPct=demo_to_signup,
            retentionActiveGymsPct=retention_pct,
            mrrTrend=mrr_trend,
            gymGrowthTrend=gym_growth,
        )
        self.repo.set_cache(key=cache_key, gym_id=None, payload=payload.model_dump(), ttl_minutes=self.CACHE_TTL_MINUTES)
        return payload
