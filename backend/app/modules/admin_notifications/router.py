from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from pymongo.database import Database

from app.core.serializers import as_str_id
from app.db.mongo import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.modules.notifications.repository import NotificationsRepository
from app.modules.notifications.service import NotificationsService

router = APIRouter(prefix="/admin/notifications", tags=["admin_notifications"])


class TestBroadcastResponse(BaseModel):
    queued: int
    activeSubscriptions: int


@router.post(
    "/test-broadcast",
    response_model=TestBroadcastResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(require_roles("super_admin"))],
)
def send_test_broadcast(db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    repo = NotificationsRepository(db)
    if repo.has_recent_platform_broadcast(within_minutes=10):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Test broadcast was sent recently. Please wait before sending again.",
        )
    users = list(
        db.users.find(
            {"role": {"$in": ["owner", "member"]}, "status": {"$ne": "inactive"}},
            {"_id": 1, "gym_id": 1},
        )
    )
    notifications = NotificationsService(db)
    active_subscriptions = db.push_subscriptions.count_documents({"active": True})
    queued = 0
    for row in users:
        gym_id = as_str_id(row.get("gym_id"))
        user_id = as_str_id(row.get("_id"))
        if not gym_id or not user_id:
            continue
        notifications.send_event_async(
            event_type="platform_test",
            title="Gymtra test notification",
            body="Push notifications are working correctly.",
            gym_id=gym_id,
            user_id=user_id,
            dedupe_key=f"platform_test:{user_id}",
            metadata={"scope": "platform_broadcast", "triggered_by": as_str_id(user.get("_id"))},
        )
        queued += 1
    return TestBroadcastResponse(queued=queued, activeSubscriptions=active_subscriptions)
