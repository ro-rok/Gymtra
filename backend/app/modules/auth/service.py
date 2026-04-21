from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.security import verify_password
from app.core.serializers import as_str_id
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import AuthUserResponse
from app.modules.public.repository import PublicRepository


class AuthService:
    def __init__(self, db: Database):
        self.db = db
        self.repo = AuthRepository(db)
        self.public_repo = PublicRepository(db)

    def login(self, *, email: str, password: str, gym_slug: str | None):
        user = self.repo.get_user_by_email(email)
        if not user or not verify_password(password, user["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        if user.get("status") != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

        role = user.get("role")
        if role == "super_admin":
            if gym_slug:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Super admin login is global")
            return user

        if not gym_slug:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gym slug is required")
        gym = self.public_repo.get_gym_by_slug(gym_slug)
        if not gym:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gym not found")
        if as_str_id(user.get("gym_id")) != as_str_id(gym.get("_id")):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User does not belong to this gym")
        return user

    def to_auth_user(self, user_doc) -> AuthUserResponse:
        gym_slug = None
        gym_id = as_str_id(user_doc.get("gym_id"))
        if gym_id:
            gym = self.db.gyms.find_one({"_id": user_doc["gym_id"]})
            gym_slug = gym.get("slug") if gym else None
        return AuthUserResponse(
            id=as_str_id(user_doc.get("_id")) or "",
            email=user_doc["email"],
            name=user_doc.get("name", ""),
            role=user_doc["role"],
            gymId=gym_id,
            gymSlug=gym_slug,
            avatar=user_doc.get("avatar"),
        )

