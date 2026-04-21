from typing import Annotated

from bson import ObjectId
from fastapi import Cookie, Depends, Header, HTTPException, Path, status
from jwt import InvalidTokenError
from pymongo.database import Database

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.mongo import get_db
from app.modules.public.repository import PublicRepository


def get_current_user(
    db: Annotated[Database, Depends(get_db)],
    token_cookie: Annotated[str | None, Cookie(alias=get_settings().auth_cookie_name)] = None,
):
    if not token_cookie:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = decode_access_token(token_cookie)
    except InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token") from exc

    user_id = payload.get("sub")
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    user = db.users.find_one({"_id": ObjectId(user_id), "status": "active"})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
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

