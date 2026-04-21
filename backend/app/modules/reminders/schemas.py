from pydantic import BaseModel


class ReminderQueueItem(BaseModel):
    memberId: str
    gymId: str
    memberName: str
    phone: str
    type: str
    message: str
    waUrl: str


class ReminderLogItem(BaseModel):
    id: str
    gymId: str
    userId: str
    eventType: str
    status: str
    channel: str | None = None
    message: str | None = None
    createdAt: str


class ReminderSendPayload(BaseModel):
    memberId: str
    type: str
    message: str
    channel: str = "whatsapp"


class ReminderQueueResponse(BaseModel):
    items: list[ReminderQueueItem]


class ReminderLogsResponse(BaseModel):
    items: list[ReminderLogItem]
