from datetime import datetime, timezone
import logging
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from pymongo.database import Database

from app.core.audit import log_audit_event
from app.core.config import get_settings
from app.core.observability import log_structured_error
from app.core.security import create_access_token
from app.db.mongo import get_db
from app.dependencies.auth import get_current_user
from app.modules.auth.schemas import AuthUserResponse, LoginPhoneRequest, LoginRequest, LoginResponse
from app.modules.auth.service import AuthService
from app.modules.auth.rate_limit import InMemoryRateLimiter
from app.modules.notifications.service import NotificationsService

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)
LOGIN_RATE_LIMITER = InMemoryRateLimiter(max_requests=10, window_seconds=60)
REFRESH_RATE_LIMITER = InMemoryRateLimiter(max_requests=30, window_seconds=60)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _rate_limit_or_raise(limiter: InMemoryRateLimiter, key: str, event_name: str) -> None:
    if limiter.allow(key):
        return
    logger.warning(event_name, extra={"event": event_name, "rate_key": key})
    raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests")


def _set_auth_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    same_site = settings.auth_cookie_samesite
    # Browsers reject SameSite=None cookies without Secure; fallback for local HTTP dev.
    if not settings.auth_cookie_secure and same_site.lower() == "none":
        same_site = "lax"
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=same_site,
        domain=settings.auth_cookie_domain or None,
        max_age=settings.jwt_expire_minutes * 60,
        path="/",
    )


def _set_refresh_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    same_site = settings.auth_cookie_samesite
    # Browsers reject SameSite=None cookies without Secure; fallback for local HTTP dev.
    if not settings.auth_cookie_secure and same_site.lower() == "none":
        same_site = "lax"
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=same_site,
        domain=settings.auth_cookie_domain or None,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        domain=settings.auth_cookie_domain or None,
    )
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path="/",
        domain=settings.auth_cookie_domain or None,
    )


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, request: Request, db: Annotated[Database, Depends(get_db)]):
    try:
        _rate_limit_or_raise(LOGIN_RATE_LIMITER, f"{_client_ip(request)}:{payload.email.lower().strip()}", "auth.login.rate_limited")
        service = AuthService(db)
        user = service.login(email=payload.email, password=payload.password, gym_slug=payload.gymSlug)
        refresh_token = service.create_refresh_session(user=user, user_agent=request.headers.get("user-agent"))
        token = create_access_token(
            subject=str(user["_id"]),
            extra_claims={
                "role": user["role"],
                "gym_id": str(user.get("gym_id")) if user.get("gym_id") else None,
                "iat": int(datetime.now(timezone.utc).timestamp()),
            },
        )
        _set_auth_cookie(response, token)
        _set_refresh_cookie(response, refresh_token)
        log_audit_event(db, action="auth.login", actor_user_id=str(user["_id"]), metadata={"role": user["role"]})
        logger.info(
            "auth.login.success",
            extra={"event": "auth.login.success", "user_id": str(user["_id"]), "role": user["role"], "ip": _client_ip(request)},
        )
        return LoginResponse(user=service.to_auth_user(user))
    except HTTPException:
        raise
    except Exception as exc:
        log_structured_error(
            logger,
            event="auth.login.unhandled_exception",
            error=exc,
            context={"ip": _client_ip(request), "email": payload.email.lower().strip()},
        )
        raise


@router.post("/login-phone", response_model=LoginResponse)
def login_phone(payload: LoginPhoneRequest, response: Response, request: Request, db: Annotated[Database, Depends(get_db)]):
    try:
        _rate_limit_or_raise(LOGIN_RATE_LIMITER, f"{_client_ip(request)}:{payload.phone.strip()}", "auth.login_phone.rate_limited")
        service = AuthService(db)
        user = service.login_phone(phone=payload.phone, password=payload.password, gym_slug=payload.gymSlug)
        refresh_token = service.create_refresh_session(user=user, user_agent=request.headers.get("user-agent"))
        token = create_access_token(
            subject=str(user["_id"]),
            extra_claims={
                "role": user["role"],
                "gym_id": str(user.get("gym_id")) if user.get("gym_id") else None,
                "iat": int(datetime.now(timezone.utc).timestamp()),
            },
        )
        _set_auth_cookie(response, token)
        _set_refresh_cookie(response, refresh_token)
        log_audit_event(db, action="auth.login_phone", actor_user_id=str(user["_id"]), metadata={"role": user["role"]})
        logger.info(
            "auth.login_phone.success",
            extra={"event": "auth.login_phone.success", "user_id": str(user["_id"]), "role": user["role"], "ip": _client_ip(request)},
        )
        return LoginResponse(user=service.to_auth_user(user))
    except HTTPException:
        raise
    except Exception as exc:
        log_structured_error(
            logger,
            event="auth.login_phone.unhandled_exception",
            error=exc,
            context={"ip": _client_ip(request), "phone": payload.phone.strip()},
        )
        raise


@router.post("/refresh", response_model=LoginResponse)
def refresh_session(
    response: Response,
    request: Request,
    refresh_cookie: Annotated[str | None, Cookie(alias=get_settings().refresh_cookie_name)] = None,
    db: Database = Depends(get_db),
):
    try:
        _rate_limit_or_raise(REFRESH_RATE_LIMITER, _client_ip(request), "auth.refresh.rate_limited")
        service = AuthService(db)
        user, new_refresh_token = service.rotate_refresh_session(
            refresh_token=refresh_cookie or "",
            user_agent=request.headers.get("user-agent"),
        )
        token = create_access_token(
            subject=str(user["_id"]),
            extra_claims={
                "role": user["role"],
                "gym_id": str(user.get("gym_id")) if user.get("gym_id") else None,
                "iat": int(datetime.now(timezone.utc).timestamp()),
            },
        )
        _set_auth_cookie(response, token)
        _set_refresh_cookie(response, new_refresh_token)
        log_audit_event(db, action="auth.refresh", actor_user_id=str(user["_id"]))
        logger.info("auth.refresh.success", extra={"event": "auth.refresh.success", "user_id": str(user["_id"]), "ip": _client_ip(request)})
        return LoginResponse(user=service.to_auth_user(user))
    except HTTPException:
        raise
    except Exception as exc:
        log_structured_error(
            logger,
            event="auth.refresh.unhandled_exception",
            error=exc,
            context={"ip": _client_ip(request)},
        )
        raise


@router.get("/me", response_model=AuthUserResponse)
def me(user=Depends(get_current_user), db: Database = Depends(get_db)):
    return AuthService(db).to_auth_user(user)


@router.post("/logout")
def logout(
    response: Response,
    refresh_cookie: Annotated[str | None, Cookie(alias=get_settings().refresh_cookie_name)] = None,
    db: Database = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        AuthService(db).revoke_refresh_session(refresh_cookie)
        NotificationsService(db).remove_all_subscriptions_for_user(
            user_id=str(user.get("_id") or ""),
            gym_id=str(user.get("gym_id")) if user.get("gym_id") else None,
        )
        _clear_auth_cookies(response)
        log_audit_event(db, action="auth.logout", actor_user_id=str(user["_id"]))
        logger.info("auth.logout", extra={"event": "auth.logout", "user_id": str(user["_id"]), "gym_id": str(user.get("gym_id") or "")})
        return {"success": True}
    except HTTPException:
        raise
    except Exception as exc:
        log_structured_error(
            logger,
            event="auth.logout.unhandled_exception",
            error=exc,
            context={"user_id": str(user.get("_id") or ""), "gym_id": str(user.get("gym_id") or "")},
        )
        raise


@router.post("/logout-all")
def logout_all_devices(response: Response, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    try:
        AuthService(db).revoke_all_refresh_sessions(user)
        NotificationsService(db).remove_all_subscriptions_for_user(
            user_id=str(user.get("_id") or ""),
            gym_id=str(user.get("gym_id")) if user.get("gym_id") else None,
        )
        _clear_auth_cookies(response)
        log_audit_event(db, action="auth.logout_all", actor_user_id=str(user["_id"]))
        logger.info(
            "auth.logout_all",
            extra={"event": "auth.logout_all", "user_id": str(user["_id"]), "gym_id": str(user.get("gym_id") or "")},
        )
        return {"success": True}
    except HTTPException:
        raise
    except Exception as exc:
        log_structured_error(
            logger,
            event="auth.logout_all.unhandled_exception",
            error=exc,
            context={"user_id": str(user.get("_id") or ""), "gym_id": str(user.get("gym_id") or "")},
        )
        raise

