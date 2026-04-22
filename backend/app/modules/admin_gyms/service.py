from fastapi import HTTPException, status
from bson import ObjectId

from app.core.security import hash_password
from app.modules.admin_gyms.repository import AdminGymsRepository
from app.modules.admin_gyms.schemas import GymCreatePayload, GymResponse, GymUpdatePayload


class AdminGymsService:
    def __init__(self, repo: AdminGymsRepository):
        self.repo = repo

    def _to_response(self, gym: dict) -> GymResponse:
        branding = self.repo.get_branding(gym["_id"]) or {}
        return GymResponse(
            id=str(gym["_id"]),
            slug=gym["slug"],
            name=gym.get("name", ""),
            city=gym.get("city", ""),
            tagline=gym.get("tagline"),
            logo=gym.get("logo"),
            members=int(gym.get("members_count", 0)),
            isActive=bool(gym.get("is_active", False)),
            seatCount=int(gym.get("seat_count", 5)),
            ownerUserId=str(gym.get("owner_user_id")) if gym.get("owner_user_id") else None,
            adminUserId=str(gym.get("admin_user_id")) if gym.get("admin_user_id") else None,
            createdAt=gym.get("created_at").isoformat() if gym.get("created_at") else "",
            brandColor=branding.get("brand_color"),
            metaTitle=branding.get("meta_title"),
            metaDescription=branding.get("meta_description"),
        )

    def list_gyms(self) -> list[GymResponse]:
        return [self._to_response(gym) for gym in self.repo.list_gyms()]

    def create_gym(self, payload: GymCreatePayload) -> GymResponse:
        if self.repo.get_by_slug(payload.slug):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Gym slug already exists")
        owner_user_id = ObjectId(payload.ownerUserId) if payload.ownerUserId and ObjectId.is_valid(payload.ownerUserId) else None
        if not owner_user_id:
            has_owner_signup = any([payload.ownerName, payload.ownerEmail, payload.ownerPhone, payload.ownerPassword])
            if has_owner_signup and not all([payload.ownerName, payload.ownerEmail, payload.ownerPassword]):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Owner name, email, and password are required when creating owner signup",
                )
            if payload.ownerEmail and self.repo.get_global_user_by_email(str(payload.ownerEmail).lower()):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Owner email already exists")
        gym = self.repo.create_gym(
            {
                "slug": payload.slug,
                "name": payload.name,
                "city": payload.city,
                "tagline": payload.tagline,
                "logo": payload.logo,
                "is_active": payload.isActive,
                "seat_count": payload.seatCount,
                "owner_user_id": owner_user_id,
                "admin_user_id": ObjectId(payload.adminUserId) if payload.adminUserId and ObjectId.is_valid(payload.adminUserId) else None,
            }
        )
        if not owner_user_id and payload.ownerEmail and payload.ownerName and payload.ownerPassword:
            owner_doc = self.repo.create_owner_user(
                {
                    "email": str(payload.ownerEmail).lower(),
                    "name": payload.ownerName,
                    "phone": payload.ownerPhone,
                    "password_hash": hash_password(payload.ownerPassword),
                    "gym_id": gym["_id"],
                }
            )
            gym = self.repo.update_gym(gym["_id"], {"owner_user_id": owner_doc["_id"]}) or gym
        self.repo.upsert_branding(
            gym["_id"],
            {
                "brand_color": payload.brandColor,
                "meta_title": payload.metaTitle,
                "meta_description": payload.metaDescription,
                "tagline": payload.tagline,
            },
        )
        return self._to_response(gym)

    def update_gym(self, gym_id: str, payload: GymUpdatePayload) -> GymResponse:
        if not ObjectId.is_valid(gym_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gym not found")
        update_data = {}
        if payload.name is not None:
            update_data["name"] = payload.name
        if payload.city is not None:
            update_data["city"] = payload.city
        if payload.tagline is not None:
            update_data["tagline"] = payload.tagline
        if payload.logo is not None:
            update_data["logo"] = payload.logo
        if payload.isActive is not None:
            update_data["is_active"] = payload.isActive
        if payload.seatCount is not None:
            update_data["seat_count"] = payload.seatCount
        if payload.ownerUserId is not None:
            update_data["owner_user_id"] = ObjectId(payload.ownerUserId) if payload.ownerUserId and ObjectId.is_valid(payload.ownerUserId) else None
        if payload.adminUserId is not None:
            update_data["admin_user_id"] = ObjectId(payload.adminUserId) if payload.adminUserId and ObjectId.is_valid(payload.adminUserId) else None
        gym = self.repo.update_gym(ObjectId(gym_id), update_data)
        if not gym:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gym not found")
        self.repo.upsert_branding(
            gym["_id"],
            {
                "brand_color": payload.brandColor,
                "meta_title": payload.metaTitle,
                "meta_description": payload.metaDescription,
                "tagline": payload.tagline,
            },
        )
        return self._to_response(gym)

    def set_gym_status(self, gym_id: str, is_active: bool) -> GymResponse:
        return self.update_gym(gym_id, GymUpdatePayload(isActive=is_active))
