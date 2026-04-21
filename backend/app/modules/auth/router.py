from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from pymongo.database import Database

from app.core.audit import log_audit_event
from app.core.config import get_settings
from app.core.security import create_access_token
from app.db.mongo import get_db
from app.dependencies.auth import get_current_user
from app.modules.auth.schemas import AuthUserResponse, LoginRequest, LoginResponse
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        domain=settings.auth_cookie_domain or None,
        max_age=settings.jwt_expire_minutes * 60,
        path="/",
    )


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Annotated[Database, Depends(get_db)]):
    service = AuthService(db)
    user = service.login(email=payload.email, password=payload.password, gym_slug=payload.gymSlug)
    token = create_access_token(
        subject=str(user["_id"]),
        extra_claims={
            "role": user["role"],
            "gym_id": str(user.get("gym_id")) if user.get("gym_id") else None,
            "iat": int(datetime.now(timezone.utc).timestamp()),
        },
    )
    _set_auth_cookie(response, token)
    log_audit_event(db, action="auth.login", actor_user_id=str(user["_id"]), metadata={"role": user["role"]})
    return LoginResponse(user=service.to_auth_user(user))


@router.get("/me", response_model=AuthUserResponse)
def me(user=Depends(get_current_user), db: Database = Depends(get_db)):
    return AuthService(db).to_auth_user(user)


@router.post("/logout")
def logout(response: Response, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    settings = get_settings()
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        domain=settings.auth_cookie_domain or None,
    )
    log_audit_event(db, action="auth.logout", actor_user_id=str(user["_id"]))
    return {"success": True}

