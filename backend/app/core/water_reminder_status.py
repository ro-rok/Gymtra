"""Compute platform-level water reminder status for admin dashboard."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from bson import ObjectId

from app.db.mongo import get_db
from app.modules.member_profiles.reminder_preferences import (
    WATER_REMINDER_END_HOUR,
    WATER_REMINDER_START_HOUR,
)

IST = ZoneInfo("Asia/Kolkata")
INTERVAL_MINUTES = 60
# Scheduler logs water reminders as water:YYYY-MM-DD:slot (dedupe key), not bare "water".
WATER_EVENT_TYPE_PATTERN = r"^water"


def _next_scheduled_datetime_ist(now_ist: datetime) -> datetime:
    start = now_ist.replace(hour=WATER_REMINDER_START_HOUR, minute=0, second=0, microsecond=0)
    end = now_ist.replace(hour=WATER_REMINDER_END_HOUR, minute=0, second=0, microsecond=0)
    if now_ist < start:
        return start
    if now_ist > end:
        return (start + timedelta(days=1)).replace(second=0, microsecond=0)
    next_hour = (now_ist.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1))
    if next_hour <= end:
        return next_hour
    return (start + timedelta(days=1)).replace(second=0, microsecond=0)


def get_water_reminder_status() -> dict:
    db = get_db()
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc.astimezone(IST)

    latest = (
        db.notification_logs.find_one(
            {"event_type": {"$regex": WATER_EVENT_TYPE_PATTERN}, "status": "sent"},
            sort=[("created_at", -1)],
        )
        or {}
    )
    gym_id = latest.get("gym_id")
    gym_name = None
    if gym_id and isinstance(gym_id, str) and ObjectId.is_valid(gym_id):
        gym = db.gyms.find_one({"_id": ObjectId(gym_id)})
        gym_name = (gym or {}).get("name")

    next_dt_ist = _next_scheduled_datetime_ist(now_ist)
    next_dt_utc = next_dt_ist.astimezone(timezone.utc)
    seconds_until = max(0, int((next_dt_utc - now_utc).total_seconds()))

    last_sent = latest.get("created_at")
    last_sent_iso = last_sent.isoformat() if isinstance(last_sent, datetime) else None

    return {
        "enabled": True,
        "last_sent_at": last_sent_iso,
        "last_sent_to_user_id": latest.get("user_id"),
        "last_sent_gym_id": gym_id,
        "last_sent_gym_name": gym_name,
        "window_start_hour": WATER_REMINDER_START_HOUR,
        "window_end_hour": WATER_REMINDER_END_HOUR,
        "interval_minutes": INTERVAL_MINUTES,
        "next_scheduled_at": next_dt_utc.isoformat(),
        "seconds_until_next_scheduled": seconds_until,
    }
