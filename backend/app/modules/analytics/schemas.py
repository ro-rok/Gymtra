from pydantic import BaseModel, Field


class AttendanceDayPoint(BaseModel):
    date: str
    count: int


class ReminderEngagementItem(BaseModel):
    eventType: str
    sent: int


class OwnerAnalyticsOverview(BaseModel):
    activeMembers: int
    expiringMemberships: int
    dailyAttendance: list[AttendanceDayPoint]
    weeklyAttendanceTrend: list[AttendanceDayPoint]
    reminderEngagement: list[ReminderEngagementItem]
    avgCheckInsPerMember: float
    membersWithStreak7Plus: int


class PlatformTrendPoint(BaseModel):
    label: str
    value: float


class PlatformAnalyticsOverview(BaseModel):
    totalGyms: int
    activeGyms: int
    activeMembersPlatform: int
    dailyActiveGyms: int
    onboardingCompletionPct: float
    demoToSignupPct: float
    retentionActiveGymsPct: float
    mrrTrend: list[PlatformTrendPoint] = Field(default_factory=list)
    gymGrowthTrend: list[PlatformTrendPoint] = Field(default_factory=list)
