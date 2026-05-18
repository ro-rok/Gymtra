from typing import Annotated

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.db.mongo import get_db
from app.dependencies.auth import require_roles
from app.modules.member_reminders.schemas import MemberRemindersRunResponse
from app.modules.member_reminders.service import MemberRemindersService

router = APIRouter(prefix="/member-reminders", tags=["member_reminders"])


@router.post(
    "/run-once",
    response_model=MemberRemindersRunResponse,
    dependencies=[Depends(require_roles("super_admin"))],
)
def run_member_reminders_once(db: Annotated[Database, Depends(get_db)]):
    result = MemberRemindersService(db).run_due_reminders()
    return MemberRemindersRunResponse(**result)
