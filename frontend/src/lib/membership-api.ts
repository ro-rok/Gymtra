import { apiGet, apiPost } from "@/lib/api-client";
import type { Membership, PlanType } from "@/lib/types";

type ApiMembership = {
  id: string;
  memberId: string;
  gymId: string;
  plan: "monthly" | "quarterly" | "half_yearly";
  amount: number;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "cancelled" | "pending_renewal";
};

const toUiPlan = (plan: ApiMembership["plan"]): PlanType =>
  plan === "monthly" ? "Monthly" : plan === "quarterly" ? "Quarterly" : "Half-Yearly";
const toApiPlan = (plan: PlanType): ApiMembership["plan"] =>
  plan === "Monthly" ? "monthly" : plan === "Quarterly" ? "quarterly" : "half_yearly";

const toMembership = (m: ApiMembership): Membership => ({
  id: m.id,
  memberId: m.memberId,
  gymId: m.gymId,
  plan: toUiPlan(m.plan),
  amount: m.amount,
  startDate: m.startDate,
  expiryDate: m.endDate,
  status: m.status === "cancelled" ? "expired" : m.status,
});

export const listMembershipsRequest = async (options?: {
  status?: string;
  expiring?: boolean;
  expired?: boolean;
}): Promise<Membership[]> => {
  const data = await apiGet<{ items: ApiMembership[] }>("/api/v1/memberships", { query: options });
  return data.items.map(toMembership);
};

export const createMembershipRequest = async (payload: {
  memberId: string;
  plan: PlanType;
  amount: number;
  startDate?: string;
}): Promise<Membership> => {
  const data = await apiPost<ApiMembership>("/api/v1/memberships", {
    memberId: payload.memberId,
    plan: toApiPlan(payload.plan),
    amount: payload.amount,
    startDate: payload.startDate,
  });
  return toMembership(data);
};

export const renewMembershipRequest = async (payload: {
  memberId: string;
  plan: PlanType;
  amount: number;
  startDate?: string;
}): Promise<Membership> => {
  const data = await apiPost<ApiMembership>(`/api/v1/memberships/members/${payload.memberId}/renew`, {
    plan: toApiPlan(payload.plan),
    amount: payload.amount,
    startDate: payload.startDate,
  });
  return toMembership(data);
};
