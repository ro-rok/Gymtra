from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    gymSlug: str | None = None


class AuthUserResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    gymId: str | None = None
    gymSlug: str | None = None
    avatar: str | None = None


class LoginResponse(BaseModel):
    user: AuthUserResponse

