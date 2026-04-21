import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { PayrollRecord } from "@/lib/types";

export const listPayrollRecordsRequest = async (): Promise<PayrollRecord[]> => {
  const data = await apiGet<{ items: PayrollRecord[]; total: number }>("/api/v1/payroll/");
  return data.items;
};

export const createPayrollRecordRequest = (payload: Omit<PayrollRecord, "id" | "gymId">) =>
  apiPost<PayrollRecord>("/api/v1/payroll/", payload);

export const updatePayrollRecordRequest = (recordId: string, payload: Partial<PayrollRecord>) =>
  apiPatch<PayrollRecord>(`/api/v1/payroll/${recordId}`, payload);

