from datetime import datetime, timezone

from bson import ObjectId
from pymongo import ReturnDocument

from app.core.security import hash_password
from app.db.mongo import get_db


def upsert_gym(db, slug: str, name: str, logo: str, city: str, tagline: str) -> ObjectId:
    now = datetime.now(timezone.utc)
    result = db.gyms.find_one_and_update(
        {"slug": slug},
        {
            "$set": {
                "name": name,
                "logo": logo,
                "city": city,
                "tagline": tagline,
                "members_count": 0,
                "is_active": True,
                "updated_at": now,
            },
            "$setOnInsert": {"slug": slug, "created_at": now},
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return result["_id"]


def upsert_user(db, *, email: str, password: str, name: str, role: str, gym_id: ObjectId | None):
    now = datetime.now(timezone.utc)
    db.users.update_one(
        {"email": email},
        {
            "$set": {
                "name": name,
                "role": role,
                "gym_id": gym_id,
                "status": "active",
                "password_hash": hash_password(password),
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )


def run_seed():
    db = get_db()
    now = datetime.now(timezone.utc)

    iron_id = upsert_gym(db, "iron-paradise", "Iron Paradise", "🏋️", "Mumbai", "Where strength is forged")
    fit_id = upsert_gym(db, "fit-republic", "Fit Republic", "💪", "Bengaluru", "Your daily revolution")

    db.tenant_branding.update_one(
        {"gym_id": iron_id},
        {
            "$set": {
                "tagline": "Where strength is forged",
                "brand_color": "#22c55e",
                "meta_title": "Iron Paradise | Gym Login",
                "meta_description": "Member and staff login for Iron Paradise.",
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    db.tenant_branding.update_one(
        {"gym_id": fit_id},
        {
            "$set": {
                "tagline": "Your daily revolution",
                "brand_color": "#3b82f6",
                "meta_title": "Fit Republic | Gym Login",
                "meta_description": "Member and staff login for Fit Republic.",
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    upsert_user(db, email="admin@gymtra.app", password="admin123", name="Super Admin", role="super_admin", gym_id=None)
    upsert_user(db, email="owner@ironparadise.com", password="owner123", name="Gym Owner", role="owner", gym_id=iron_id)
    upsert_user(db, email="trainer@ironparadise.com", password="trainer123", name="Gym Trainer", role="trainer", gym_id=iron_id)
    upsert_user(db, email="aarav@email.com", password="member123", name="Aarav Sharma", role="member", gym_id=iron_id)

    db.subscriptions.update_one(
        {"gym_id": iron_id},
        {
            "$set": {
                "plan": "Pro",
                "status": "active",
                "seats": 10,
                "used_seats": 4,
                "start_date": now,
                "end_date": now.replace(year=now.year + 1),
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    print("Seed complete.")


if __name__ == "__main__":
    run_seed()

