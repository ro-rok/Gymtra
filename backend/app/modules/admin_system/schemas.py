from pydantic import BaseModel


class KeepaliveStatusResponse(BaseModel):
    enabled: bool
    lastPingAt: str | None = None
    lastStatus: str | None = None
    lastMessage: str | None = None
    pingCount: int = 0
    intervalSeconds: int
    isHealthy: bool
    secondsSinceLastPing: int | None = None
    nextPingInSeconds: int | None = None


class WaterReminderStatusResponse(BaseModel):
    enabled: bool
    lastSentAt: str | None = None
    lastSentToUserId: str | None = None
    lastSentGymId: str | None = None
    lastSentGymName: str | None = None
    windowStartHour: int
    windowEndHour: int
    intervalMinutes: int
    nextScheduledAt: str | None = None
    secondsUntilNextScheduled: int | None = None
