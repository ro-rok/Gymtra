from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.db.mongo import get_db


def ensure_indexes() -> None:
    db = get_db()
    db.gyms.create_index("slug", unique=True)
    db.users.create_index("email", unique=True)
    db.users.create_index([("gym_id", 1), ("role", 1)])
    db.tenant_branding.create_index("gym_id", unique=True)
    db.subscriptions.create_index("gym_id")
    db.audit_logs.create_index("created_at")
    db.push_subscriptions.create_index("endpoint", unique=True)
    db.push_subscriptions.create_index([("user_id", 1), ("gym_id", 1), ("active", 1)])
    db.system_settings.create_index("key", unique=True)
    db.member_profiles.create_index([("gym_id", 1), ("user_id", 1)], unique=True)
    db.memberships.create_index([("gym_id", 1), ("user_id", 1), ("status", 1)])
    db.memberships.create_index([("gym_id", 1), ("end_date", 1)])
    db.memberships.create_index([("gym_id", 1), ("created_at", -1)])
    db.attendance.create_index([("gym_id", 1), ("member_id", 1), ("day_key", 1)], unique=True)
    db.attendance.create_index([("gym_id", 1), ("day_key", 1)])
    db.daily_tasks.create_index([("gym_id", 1), ("member_id", 1), ("day_key", 1)], unique=True)
    db.qr_nonce_consumptions.create_index([("expires_at", 1)], expireAfterSeconds=0)
    db.qr_nonce_consumptions.create_index([("gym_id", 1), ("nonce", 1)], unique=True)
    db.notification_logs.create_index([("gym_id", 1), ("user_id", 1), ("event_type", 1), ("created_at", -1)])
    db.diet_templates.create_index([("gym_id", 1), ("updated_at", -1)])
    db.member_diet_assignments.create_index([("gym_id", 1), ("member_id", 1), ("active", 1)])
    db.member_diet_assignments.create_index([("gym_id", 1), ("member_id", 1), ("assigned_at", -1)])
    db.progress_logs.create_index([("gym_id", 1), ("member_id", 1), ("log_date", 1)])
    db.expenses.create_index([("gym_id", 1), ("expense_date", -1)])
    db.staff_profiles.create_index([("gym_id", 1), ("user_id", 1)], unique=True)
    db.payroll_records.create_index([("gym_id", 1), ("month", -1), ("created_at", -1)])
    db.leave_records.create_index([("gym_id", 1), ("leave_date", -1)])


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_indexes()
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/health")
def health_check():
    return {"status": "ok"}

