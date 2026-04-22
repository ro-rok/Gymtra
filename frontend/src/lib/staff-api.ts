import { apiGet, apiPost } from "@/lib/api-client";
import type { StaffMember } from "@/lib/types";

export const listStaffRequest = async (): Promise<StaffMember[]> => {
  const data = await apiGet<{ items: StaffMember[]; total: number }>("/api/v1/staff/");
  return data.items;
};

export const createTrainerRequest = (payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "trainer";
  salary: number;
}) => apiPost<StaffMember>("/api/v1/staff/", payload);

