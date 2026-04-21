from pydantic import BaseModel


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionPayload(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys
    userAgent: str | None = None


class RemovePushSubscriptionPayload(BaseModel):
    endpoint: str


class TriggerNotificationPayload(BaseModel):
    eventType: str
    title: str
    body: str
    userId: str | None = None
