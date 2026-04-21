from fastapi import APIRouter

from app.modules.admin_gyms.router import router as admin_gyms_router
from app.modules.admin_subscriptions.router import router as admin_subscriptions_router
from app.modules.attendance.router import router as attendance_router
from app.modules.auth.router import router as auth_router
from app.modules.diets.router import router as diets_router
from app.modules.expenses.router import router as expenses_router
from app.modules.leave_records.router import router as leave_records_router
from app.modules.member_profiles.router import router as member_profiles_router
from app.modules.memberships.router import router as memberships_router
from app.modules.notifications.router import router as notifications_router
from app.modules.payroll.router import router as payroll_router
from app.modules.progress.router import router as progress_router
from app.modules.public.router import router as public_router
from app.modules.reminders.router import router as reminders_router
from app.modules.staff.router import router as staff_router
from app.modules.tenants.router import router as tenants_router

api_router = APIRouter()
api_router.include_router(admin_gyms_router)
api_router.include_router(admin_subscriptions_router)
api_router.include_router(attendance_router)
api_router.include_router(auth_router)
api_router.include_router(member_profiles_router)
api_router.include_router(memberships_router)
api_router.include_router(diets_router)
api_router.include_router(progress_router)
api_router.include_router(expenses_router)
api_router.include_router(staff_router)
api_router.include_router(payroll_router)
api_router.include_router(leave_records_router)
api_router.include_router(reminders_router)
api_router.include_router(public_router)
api_router.include_router(tenants_router)
api_router.include_router(notifications_router)

