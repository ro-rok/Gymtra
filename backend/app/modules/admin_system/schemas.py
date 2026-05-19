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
