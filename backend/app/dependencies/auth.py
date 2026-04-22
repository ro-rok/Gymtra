import logging
from typing import Annotated

from bson import ObjectId
from fastapi import Cookie, Depends, Header, HTTPException, Path, status
from jwt import InvalidTokenError
from pymongo.database import Database

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.mongo import get_db
from app.modules.public.repository import PublicRepository

logger = logging.getLogger(__name__)


def require_actor_gym_id(user: dict) -> ObjectId:
    gym_id = user.get("gym_id")
    if not gym_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gym context is required")
    return gym_id


def enforce_resource_gym(resource_gym_id: ObjectId | None, actor: dict) -> None:
    actor_gym_id = require_actor_gym_id(actor)
    if resource_gym_id is None or str(resource_gym_id) != str(actor_gym_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden for current gym")


def get_current_user(
    db: Annotated[Database, Depends(get_db)],
    token_cookie: Annotated[str | None, Cookie(alias=get_settings().auth_cookie_name)] = None,
    tenant_slug_header: Annotated[str | None, Header(alias="X-Tenant-Slug")] = None,
):
    if not token_cookie:
        logger.warning("auth.debug.no_cookie")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = decode_access_token(token_cookie)
    except InvalidTokenError as exc:
        logger.warning("auth.debug.token_decode_failed")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token") from exc

    user_id = payload.get("sub")
    role = payload.get("role")
    token_gym_id = payload.get("gym_id")
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    query: dict = {"_id": ObjectId(user_id), "status": "active"}
    if role != "super_admin":
        if not token_gym_id or not ObjectId.is_valid(token_gym_id):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid tenant in token")
        query["gym_id"] = ObjectId(token_gym_id)

    user = db.users.find_one(query)
    if not user:
        logger.warning("auth.debug.user_lookup_failed")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    enforce_tenant_slug_match(db=db, user=user, slug=tenant_slug_header)
    return user


def require_roles(*roles: str):
    def dependency(user=Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return dependency


def resolve_tenant_gym(
    db: Annotated[Database, Depends(get_db)],
    gym_slug_path: Annotated[str | None, Path(alias="gym_slug")] = None,
    gym_slug_header: Annotated[str | None, Header(alias="X-Tenant-Slug")] = None,
):
    slug = gym_slug_path or gym_slug_header
    if not slug:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant slug is required")
    gym = PublicRepository(db).get_gym_by_slug(slug)
    if not gym:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gym not found")
    return gym


def enforce_tenant_slug_match(*, db: Database, user: dict, slug: str | None) -> None:
    # Slug is treated as a routing/display hint only; auth is always token+DB driven.
    if not slug or user.get("role") == "super_admin":
        return
    actor_gym_id = require_actor_gym_id(user)
    gym = PublicRepository(db).get_gym_by_slug(slug)
    if not gym:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gym not found")
    if str(gym.get("_id")) != str(actor_gym_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden for current gym")

