import { apiGet } from "@/lib/api-client";

export interface AttendanceDayPoint {
  date: string;
  count: number;
}

export interface ReminderEngagementItem {
  eventType: string;
  sent: number;
}

export interface OwnerAnalyticsOverview {
  activeMembers: number;
  expiringMemberships: number;
  dailyAttendance: AttendanceDayPoint[];
  weeklyAttendanceTrend: AttendanceDayPoint[];
  reminderEngagement: ReminderEngagementItem[];
  avgCheckInsPerMember: number;
  membersWithStreak7Plus: number;
}

export interface PlatformTrendPoint {
  label: string;
  value: number;
}

export interface PlatformAnalyticsOverview {
  totalGyms: number;
  activeGyms: number;
  activeMembersPlatform: number;
  dailyActiveGyms: number;
  onboardingCompletionPct: number;
  demoToSignupPct: number;
  retentionActiveGymsPct: number;
  mrrTrend: PlatformTrendPoint[];
  gymGrowthTrend: PlatformTrendPoint[];
}

export const getOwnerAnalyticsOverviewRequest = () =>
  apiGet<OwnerAnalyticsOverview>("/api/v1/analytics/owner/overview");

export const getPlatformAnalyticsOverviewRequest = () =>
  apiGet<PlatformAnalyticsOverview>("/api/v1/analytics/platform/overview");
