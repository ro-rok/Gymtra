import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMemberDashboardAttendanceTasksRequest,
  type AttendanceItem,
  type MemberDashboardAttendanceTasksResponse,
} from "@/lib/attendance-api";
import { getISTDateString, getISTMonthKey } from "@/lib/datetime";

export const MEMBER_ATTENDANCE_QUERY_KEY = ["member-attendance-dashboard"] as const;

const addDaysIST = (isoDate: string, delta: number) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + delta);
  return getISTDateString(date);
};

export const getCheckInStats = (attendance: AttendanceItem[], today: string) => {
  const presentDates = [
    ...new Set(attendance.filter((a) => a.status === "present").map((a) => a.date)),
  ].sort((a, b) => b.localeCompare(a));

  const checkedInToday = presentDates.includes(today);
  const lastCheckInDate = presentDates[0] ?? null;

  const presentSet = new Set(presentDates);
  let checkInStreak = 0;
  let cursor = today;
  while (presentSet.has(cursor)) {
    checkInStreak += 1;
    cursor = addDaysIST(cursor, -1);
  }

  const monthPrefix = getISTMonthKey();
  const sessionsThisMonth = attendance.filter(
    (a) => a.status === "present" && a.date.startsWith(monthPrefix),
  ).length;

  return { checkedInToday, lastCheckInDate, checkInStreak, sessionsThisMonth, presentDates };
};

export const useMemberAttendanceDashboard = () => {
  const queryClient = useQueryClient();
  const today = getISTDateString();

  const query = useQuery({
    queryKey: MEMBER_ATTENDANCE_QUERY_KEY,
    queryFn: getMemberDashboardAttendanceTasksRequest,
    staleTime: 15_000,
  });

  const optimisticCheckIn = useCallback(
    (item: AttendanceItem) => {
      queryClient.setQueryData<MemberDashboardAttendanceTasksResponse>(
        MEMBER_ATTENDANCE_QUERY_KEY,
        (old) => {
          const base: MemberDashboardAttendanceTasksResponse = old ?? {
            todayTasks: null,
            attendance: [],
            stats: {
              streak: 0,
              completedDays: 0,
              skippedDaysThisMonth: 0,
              absentDays30: 0,
              longAbsent: false,
            },
          };
          const attendance = [
            item,
            ...base.attendance.filter((a) => a.date !== item.date),
          ];
          return { ...base, attendance };
        },
      );
    },
    [queryClient],
  );

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: MEMBER_ATTENDANCE_QUERY_KEY }),
    [queryClient],
  );

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        invalidate();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [queryClient]);

  const attendance = query.data?.attendance ?? [];
  const checkInStats = getCheckInStats(attendance, today);

  return {
    ...query,
    today,
    attendance,
    todayTasks: query.data?.todayTasks ?? null,
    habitStreak: query.data?.stats.streak ?? 0,
    absentDays30: query.data?.stats.absentDays30 ?? 0,
    ...checkInStats,
    optimisticCheckIn,
    invalidate,
    refetch: query.refetch,
  };
};
