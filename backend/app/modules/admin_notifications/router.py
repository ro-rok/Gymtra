from datetime import datetime, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from pymongo.database import Database

from app.core.serializers import as_str_id
from app.db.mongo import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.modules.member_reminders.service import REMINDER_COPY
from app.modules.notifications.service import NotificationsService

router = APIRouter(prefix="/admin/notifications", tags=["admin_notifications"])


class TestBroadcastResponse(BaseModel):
    queued: int
    activeSubscriptions: int


class TestBroadcastRequest(BaseModel):
    template: Literal["generic", "water"] = "generic"


def _broadcast_test_notifications(
    db: Database,
    *,
    template: Literal["generic", "water"],
    triggered_by: str | None,
) -> TestBroadcastResponse:
    users = list(
        db.users.find(
            {"role": {"$in": ["owner", "member"]}, "status": {"$ne": "inactive"}},
            {"_id": 1, "gym_id": 1},
        )
    )
    notifications = NotificationsService(db)
    active_subscriptions = db.push_subscriptions.count_documents({"active": True})
    ts = int(datetime.now(timezone.utc).timestamp())
    if template == "water":
        title, body = REMINDER_COPY["water"]
        event_type = f"water:test:{ts}"
        scope = "platform_water_test"
    else:
        title = "Gymtra test notification"
        body = "Push notifications are working correctly."
        event_type = f"platform_test:{ts}"
        scope = "platform_broadcast"
    queued = 0
    for row in users:
        gym_id = as_str_id(row.get("gym_id"))
        user_id = as_str_id(row.get("_id"))
        if not gym_id or not user_id:
            continue
        notifications.send_event_async(
            event_type=event_type,
            title=title,
            body=body,
            gym_id=gym_id,
            user_id=user_id,
            metadata={"scope": scope, "triggered_by": triggered_by},
        )
        queued += 1
    return TestBroadcastResponse(queued=queued, activeSubscriptions=active_subscriptions)


@router.post(
    "/test-broadcast",
    response_model=TestBroadcastResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(require_roles("super_admin"))],
)
def send_test_broadcast(
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
    payload: TestBroadcastRequest | None = None,
):
    template = payload.template if payload else "generic"
    return _broadcast_test_notifications(
        db,
        template=template,
        triggered_by=as_str_id(user.get("_id")),
    )
