from fastapi import APIRouter, Depends

from app.core.keepalive_status import get_keepalive_status
from app.dependencies.auth import require_roles
from app.modules.admin_system.schemas import KeepaliveStatusResponse

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
