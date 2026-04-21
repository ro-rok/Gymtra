import { apiGet, apiPost } from "@/lib/api-client";

export interface AttendanceItem {
  id: string;
  memberId: string;
  gymId: string;
  date: string;
  status: "present" | "skipped";
  markedBy: string;
  source: "manual" | "member_self" | "qr";
}

export interface AttendanceDayResponse {
  date: string;
  items: AttendanceItem[];
}

export interface DailyTaskRecord {
  id: string;
  memberId: string;
  gymId: string;
  date: string;
  workout: boolean;
  meal: boolean;
  water: boolean;
  waterLiters: number;
}

export interface MemberDashboardAttendanceTasksResponse {
  todayTasks: DailyTaskRecord | null;
  attendance: AttendanceItem[];
  stats: {
    streak: number;
    completedDays: number;
    skippedDaysThisMonth: number;
    absentDays30: number;
    longAbsent: boolean;
  };
}

export const getAttendanceForDayRequest = (date: string) =>
  apiGet<AttendanceDayResponse>("/api/v1/attendance/day", { query: { date } });

export const markAttendanceRequest = (payload: {
  memberId: string;
  date: string;
  status: "present" | "skipped";
}) => apiPost<AttendanceItem>("/api/v1/attendance/mark", payload);

export const memberSelfCheckInRequest = (date?: string) =>
  apiPost<AttendanceItem>("/api/v1/attendance/self-checkin", { date });

export const createAttendanceQrTokenRequest = () => apiPost<{ token: string; expiresAt: string }>("/api/v1/attendance/qr/token");

export const verifyAttendanceQrRequest = (token: string) =>
  apiPost<AttendanceItem>("/api/v1/attendance/qr/verify", { token });

export const upsertDailyTasksRequest = (payload: {
  date: string;
  workout: boolean;
  meal: boolean;
  water: boolean;
  waterLiters?: number;
}) => apiPost<DailyTaskRecord>("/api/v1/attendance/tasks", payload);

export const getMemberDashboardAttendanceTasksRequest = () =>
  apiGet<MemberDashboardAttendanceTasksResponse>("/api/v1/attendance/member/dashboard");

