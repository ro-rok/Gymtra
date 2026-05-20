from fastapi import APIRouter, Depends

from app.core.keepalive_status import get_keepalive_status
from app.core.water_reminder_status import get_water_reminder_status
from app.dependencies.auth import require_roles
from app.modules.admin_system.schemas import KeepaliveStatusResponse, WaterReminderStatusResponse

router = APIRouter(
    prefix="/admin/system",
    tags=["admin_system"],
    dependencies=[Depends(require_roles("super_admin"))],
)


@router.get("/keepalive", response_model=KeepaliveStatusResponse)
def get_keepalive_status_endpoint():
    raw = get_keepalive_status()
    return KeepaliveStatusResponse(
        enabled=raw["enabled"],
        lastPingAt=raw["last_ping_at"],
        lastStatus=raw["last_status"],
        lastMessage=raw["last_message"],
        pingCount=raw["ping_count"],
        intervalSeconds=raw["interval_seconds"],
        isHealthy=raw["is_healthy"],
        secondsSinceLastPing=raw["seconds_since_last_ping"],
        nextPingInSeconds=raw["next_ping_in_seconds"],
    )


@router.get("/water-reminders", response_model=WaterReminderStatusResponse)
def get_water_reminders_status_endpoint():
    raw = get_water_reminder_status()
    return WaterReminderStatusResponse(
        enabled=raw["enabled"],
        lastSentAt=raw["last_sent_at"],
        lastSentToUserId=raw["last_sent_to_user_id"],
        lastSentGymId=raw["last_sent_gym_id"],
        lastSentGymName=raw["last_sent_gym_name"],
        windowStartHour=raw["window_start_hour"],
        windowEndHour=raw["window_end_hour"],
        intervalMinutes=raw["interval_minutes"],
        nextScheduledAt=raw["next_scheduled_at"],
        secondsUntilNextScheduled=raw["seconds_until_next_scheduled"],
    )
