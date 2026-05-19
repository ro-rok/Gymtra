"""Persist and read Render keep-alive ping status in MongoDB."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from app.db.mongo import get_db

KEEPALIVE_SETTINGS_KEY = "keepalive_status"
DEFAULT_INTERVAL_SECONDS = 840
HEALTH_GRACE_SECONDS = 300


def get_keepalive_interval_seconds() -> int:
    return int(os.getenv("KEEPALIVE_INTERVAL", str(DEFAULT_INTERVAL_SECONDS)))


def is_keepalive_enabled() -> bool:
    return bool(os.getenv("RENDER"))


def record_keepalive_ping(*, status: str, message: str) -> datetime:
    now = datetime.now(timezone.utc)
    db = get_db()
    db.system_settings.update_one(
        {"key": KEEPALIVE_SETTINGS_KEY},
        {
            "$set": {
                "key": KEEPALIVE_SETTINGS_KEY,
                "last_ping_at": now,
                "last_status": status,
                "last_message": message,
                "updated_at": now,
            },
            "$inc": {"ping_count": 1},
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    return now


def _parse_ping_at(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    return None


def get_keepalive_status() -> dict[str, Any]:
    interval_seconds = get_keepalive_interval_seconds()
    enabled = is_keepalive_enabled()
    grace_seconds = interval_seconds + HEALTH_GRACE_SECONDS
    now = datetime.now(timezone.utc)

    row = get_db().system_settings.find_one({"key": KEEPALIVE_SETTINGS_KEY}) or {}
    last_ping_at = _parse_ping_at(row.get("last_ping_at"))
    ping_count = int(row.get("ping_count") or 0)

    seconds_since_last_ping: int | None = None
    is_healthy = False
    next_ping_in_seconds: int | None = None

    if last_ping_at is not None:
        seconds_since_last_ping = max(0, int((now - last_ping_at).total_seconds()))
        is_healthy = seconds_since_last_ping <= grace_seconds
        elapsed_in_cycle = seconds_since_last_ping % interval_seconds
        next_ping_in_seconds = interval_seconds - elapsed_in_cycle
        if next_ping_in_seconds == interval_seconds:
            next_ping_in_seconds = 0

    return {
        "enabled": enabled,
        "last_ping_at": last_ping_at.isoformat() if last_ping_at else None,
        "last_status": row.get("last_status"),
        "last_message": row.get("last_message"),
        "ping_count": ping_count,
        "interval_seconds": interval_seconds,
        "is_healthy": is_healthy,
        "seconds_since_last_ping": seconds_since_last_ping,
        "next_ping_in_seconds": next_ping_in_seconds,
    }
