from typing import Annotated

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.db.mongo import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.modules.analytics.schemas import OwnerAnalyticsOverview, PlatformAnalyticsOverview
from app.modules.analytics.service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get(
    "/owner/overview",
    response_model=OwnerAnalyticsOverview,
    dependencies=[Depends(require_roles("owner", "trainer"))],
)
def owner_analytics_overview(db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return AnalyticsService(db).owner_overview(user)


@router.get(
    "/platform/overview",
    response_model=PlatformAnalyticsOverview,
    dependencies=[Depends(require_roles("super_admin"))],
)
def platform_analytics_overview(db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return AnalyticsService(db).platform_overview(user)
