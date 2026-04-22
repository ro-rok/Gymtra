from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.db.mongo import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.modules.tenants.repository import TenantsRepository
from app.modules.tenants.schemas import (
    TenantBrandingResponse,
    TenantLogoUpdateRequest,
    TenantLogoUploadSignRequest,
    TenantLogoUploadSignResponse,
)
from app.modules.tenants.service import TenantsService

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("/{slug}/branding", response_model=TenantBrandingResponse)
def get_tenant_branding(slug: str, db: Annotated[Database, Depends(get_db)]):
    payload = TenantsService(TenantsRepository(db)).get_branding_by_slug(slug)
    if not payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return payload


@router.post(
    "/{slug}/branding/logo/sign",
    response_model=TenantLogoUploadSignResponse,
    dependencies=[Depends(require_roles("owner"))],
)
def sign_logo_upload(
    slug: str,
    payload: TenantLogoUploadSignRequest,
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
):
    return TenantsService(TenantsRepository(db)).create_logo_upload_signature(actor=user, slug=slug, payload=payload)


@router.patch(
    "/{slug}/branding/logo",
    response_model=TenantBrandingResponse,
    dependencies=[Depends(require_roles("owner"))],
)
def update_logo(
    slug: str,
    payload: TenantLogoUpdateRequest,
    db: Annotated[Database, Depends(get_db)],
    user=Depends(get_current_user),
):
    return TenantsService(TenantsRepository(db)).update_logo(actor=user, slug=slug, payload=payload)

