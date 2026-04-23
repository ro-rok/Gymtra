from functools import lru_cache
from typing import Annotated, List, Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Gymtra API"
    app_env: str = "development"
    api_prefix: str = "/api/v1"

    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "gymtra"

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 720
    refresh_token_expire_days: int = 30

    auth_cookie_name: str = "gymtra_access_token"
    refresh_cookie_name: str = "gymtra_refresh_token"
    auth_cookie_secure: bool = False
    auth_cookie_samesite: Literal["none", "lax", "strict"] = "none"
    auth_cookie_domain: str | None = None

    frontend_origins: Annotated[List[str], NoDecode] = ["http://localhost:8080", "http://127.0.0.1:8080"]
    public_base_url: str = "http://localhost:8080"
    qr_token_secret: str = "change-me-qr"
    qr_token_ttl_seconds: int = 300
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_subject: str = "mailto:admin@gymtra.local"
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    cloudinary_upload_folder: str = "gymtra"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_use_tls: bool = True

    @field_validator("frontend_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value
        if not value:
            return []
        return [item.strip() for item in value.split(",") if item.strip()]

    @model_validator(mode="after")
    def validate_cookie_security(self):
        env = (self.app_env or "").strip().lower()
        cross_origin_enabled = len(self.frontend_origins) > 0
        same_site = self.auth_cookie_samesite.lower()

        if cross_origin_enabled and same_site != "none":
            raise ValueError("AUTH_COOKIE_SAMESITE must be 'none' when cross-origin credentials are enabled")
        if env == "production" and not self.auth_cookie_secure:
            raise ValueError("AUTH_COOKIE_SECURE must be true in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()

