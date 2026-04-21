import { apiGet } from "@/lib/api-client";
import type { StaffMember } from "@/lib/types";

export const listStaffRequest = async (): Promise<StaffMember[]> => {
  const data = await apiGet<{ items: StaffMember[]; total: number }>("/api/v1/staff/");
  return data.items;
};

