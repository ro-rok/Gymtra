from typing import Annotated

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.db.mongo import get_db
from app.dependencies.auth import get_current_user, require_roles
from app.modules.reminders.repository import RemindersRepository
from app.modules.reminders.schemas import ReminderLogsResponse, ReminderQueueResponse, ReminderSendPayload
from app.modules.reminders.service import RemindersService

router = APIRouter(prefix="/reminders", tags=["reminders"], dependencies=[Depends(require_roles("owner", "trainer", "super_admin"))])


@router.get("/queue", response_model=ReminderQueueResponse)
def get_queue(db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    items = RemindersService(RemindersRepository(db)).queue(user)
    return ReminderQueueResponse(items=items)


@router.get("/logs", response_model=ReminderLogsResponse)
def get_logs(db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    items = RemindersService(RemindersRepository(db)).logs(user)
    return ReminderLogsResponse(items=items)


@router.post("/send")
def send_reminder(payload: ReminderSendPayload, db: Annotated[Database, Depends(get_db)], user=Depends(get_current_user)):
    return RemindersService(RemindersRepository(db)).send(user, payload)
