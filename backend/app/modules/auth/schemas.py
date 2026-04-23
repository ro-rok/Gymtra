from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    gymSlug: str | None = None


class LoginPhoneRequest(BaseModel):
    phone: str
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
    mustChangePassword: bool = False


class LoginResponse(BaseModel):
    user: AuthUserResponse


class ChangePasswordRequiredPayload(BaseModel):
    newPassword: str


class PasswordResetRequestCreatePayload(BaseModel):
    gymSlug: str
    identifier: str


class PasswordResetRequestItem(BaseModel):
    id: str
    memberId: str
    memberName: str
    memberEmail: str | None = None
    memberPhone: str | None = None
    createdAt: str
    status: str


class PasswordResetRequestListResponse(BaseModel):
    items: list[PasswordResetRequestItem]
    total: int

