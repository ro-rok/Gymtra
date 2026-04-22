from typing import Annotated

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.core.serializers import as_str_id
from app.db.mongo import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.modules.notifications.schemas import (
    PushSubscriptionPayload,
    RemovePushSubscriptionPayload,
    TriggerNotificationPayload,
)
from app.modules.notifications.service import NotificationsService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/push-subscriptions")
def save_push_subscription(
    payload: PushSubscriptionPayload,
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
):
    NotificationsService(db).save_subscription(
        endpoint=payload.endpoint,
        keys=payload.keys.model_dump(),
        user_id=as_str_id(user.get("_id")) or "",
        gym_id=as_str_id(user.get("gym_id")),
        user_agent=payload.userAgent,
    )
    return {"success": True}


@router.delete("/push-subscriptions")
def remove_push_subscription(
    payload: RemovePushSubscriptionPayload,
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
):
    NotificationsService(db).remove_subscription(
        endpoint=payload.endpoint,
        user_id=as_str_id(user.get("_id")) or "",
        gym_id=as_str_id(user.get("gym_id")),
    )
    return {"success": True}


@router.post("/trigger", dependencies=[Depends(require_roles("owner", "trainer", "super_admin"))])
def trigger_notification(
    payload: TriggerNotificationPayload,
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
):
    NotificationsService(db).send_event_async(
        event_type=payload.eventType,
        title=payload.title,
        body=payload.body,
        gym_id=as_str_id(user.get("gym_id")) or "",
        user_id=payload.userId,
    )
    return {"success": True}

