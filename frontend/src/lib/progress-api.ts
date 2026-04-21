import { apiGet, apiPost } from "@/lib/api-client";
import type { ProgressLog } from "@/lib/types";

export const addProgressLogRequest = (payload: Omit<ProgressLog, "id" | "memberId" | "gymId">) =>
  apiPost<ProgressLog>("/api/v1/progress/logs", payload);

export const listProgressLogsRequest = (memberId?: string) =>
  apiGet<{ items: ProgressLog[]; total: number }>("/api/v1/progress/logs", { query: { memberId } });

export const getProgressSeriesRequest = (memberId?: string) =>
  apiGet<{ points: Array<{ date: string; weightKg: number; bodyFatPct?: number; measurements?: Record<string, number> }>; firstWeight?: number; latestWeight?: number; deltaWeight: number }>(
    "/api/v1/progress/series",
    { query: { memberId } },
  );

