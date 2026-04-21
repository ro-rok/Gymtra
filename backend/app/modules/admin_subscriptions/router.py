from typing import Annotated

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.db.mongo import get_db
from app.dependencies.auth import require_roles
from app.modules.admin_subscriptions.repository import AdminSubscriptionsRepository
from app.modules.admin_subscriptions.schemas import SubscriptionResponse, SubscriptionUpdatePayload
from app.modules.admin_subscriptions.service import AdminSubscriptionsService

router = APIRouter(
    prefix="/admin/subscriptions",
    tags=["admin_subscriptions"],
    dependencies=[Depends(require_roles("super_admin"))],
)


@router.get("", response_model=list[SubscriptionResponse])
def list_subscriptions(db: Annotated[Database, Depends(get_db)]):
    return AdminSubscriptionsService(AdminSubscriptionsRepository(db)).list_subscriptions()


@router.patch("/gyms/{gym_id}", response_model=SubscriptionResponse)
def update_subscription(gym_id: str, payload: SubscriptionUpdatePayload, db: Annotated[Database, Depends(get_db)]):
    return AdminSubscriptionsService(AdminSubscriptionsRepository(db)).update_subscription(gym_id, payload)
