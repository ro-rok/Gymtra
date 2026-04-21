from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.db.mongo import get_db
from app.modules.tenants.repository import TenantsRepository
from app.modules.tenants.schemas import TenantBrandingResponse
from app.modules.tenants.service import TenantsService

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("/{slug}/branding", response_model=TenantBrandingResponse)
def get_tenant_branding(slug: str, db: Annotated[Database, Depends(get_db)]):
    payload = TenantsService(TenantsRepository(db)).get_branding_by_slug(slug)
    if not payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return payload

