import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { LeaveRecord } from "@/lib/types";

export const listLeaveRecordsRequest = async (): Promise<LeaveRecord[]> => {
  const data = await apiGet<{ items: LeaveRecord[]; total: number }>("/api/v1/leave-records/");
  return data.items;
};

export const createLeaveRecordRequest = (payload: Omit<LeaveRecord, "id" | "gymId" | "staffName">) =>
  apiPost<LeaveRecord>("/api/v1/leave-records/", payload);

export const updateLeaveRecordRequest = (recordId: string, payload: Partial<LeaveRecord>) =>
  apiPatch<LeaveRecord>(`/api/v1/leave-records/${recordId}`, payload);

