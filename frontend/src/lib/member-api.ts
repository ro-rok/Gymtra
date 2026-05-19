import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { MemberProfile } from "@/lib/types";

type ApiMember = {
  id: string;
  gymId: string;
  name: string;
  email: string;
  phone?: string;
  joinDate: string;
  status: "active" | "expired" | "pending_renewal";
  avatar?: string;
  age?: number;
  gender?: string;
  heightCm?: number;
  currentWeightKg?: number;
  goalWeightKg?: number;
  activityLevel?: string;
  allergies?: string;
  foodPreference?: string;
  medicalConditions?: string;
  mealTimings?: string;
  bodyFatPct?: number;
  measurements?: Record<string, number>;
  sessionCount?: number;
};

type ApiListResponse = { items: ApiMember[]; total: number };
type ApiSummary = {
  total: number;
  active: number;
  expired: number;
  pendingRenewal: number;
  expiringSoon: number;
  unpaid: number;
};

const toMemberProfile = (api: ApiMember): MemberProfile => ({
  id: api.id,
  userId: api.id,
  gymId: api.gymId,
  name: api.name,
  phone: api.phone || "",
  email: api.email,
  age: api.age,
  gender: api.gender,
  heightCm: api.heightCm,
  currentWeightKg: api.currentWeightKg,
  goalWeightKg: api.goalWeightKg,
  activityLevel: api.activityLevel,
  allergies: api.allergies,
  foodPreference: api.foodPreference,
  medicalConditions: api.medicalConditions,
  mealTimings: api.mealTimings,
  bodyFatPct: api.bodyFatPct,
  joinDate: api.joinDate,
  avatar: api.avatar || api.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(),
  status: api.status,
  sessionCount: api.sessionCount ?? 0,
});

export const listMembersRequest = async (q?: string, status?: string): Promise<MemberProfile[]> => {
  const data = await apiGet<ApiListResponse>("/api/v1/member-profiles/members", {
    query: { q, status },
  });
  return data.items.map(toMemberProfile);
};

export const getMemberRequest = async (memberId: string): Promise<MemberProfile> => {
  const data = await apiGet<ApiMember>(`/api/v1/member-profiles/members/${memberId}`);
  return toMemberProfile(data);
};

export const createMemberRequest = async (payload: {
  name: string;
  phone: string;
  email: string;
  password: string;
  joinDate: string;
  age?: number;
  gender?: "male" | "female" | "other";
  heightCm?: number;
  currentWeightKg?: number;
  goalWeightKg?: number;
  activityLevel?: "sedentary" | "lightly_active" | "active" | "athlete";
  allergies?: string;
  foodPreference?: string;
  medicalConditions?: string;
  mealTimings?: string;
  bodyFatPct?: number;
  measurements?: Record<string, number>;
}): Promise<MemberProfile> => {
  const data = await apiPost<ApiMember>("/api/v1/member-profiles/members", payload);
  return toMemberProfile(data);
};

export const updateMemberRequest = async (memberId: string, payload: Partial<ApiMember>): Promise<MemberProfile> => {
  const data = await apiPatch<ApiMember>(`/api/v1/member-profiles/members/${memberId}`, payload);
  return toMemberProfile(data);
};

export const updateSelfMemberProfileRequest = async (payload: Partial<ApiMember>): Promise<MemberProfile> => {
  const data = await apiPatch<ApiMember>("/api/v1/member-profiles/me", payload);
  return toMemberProfile(data);
};

export const memberDashboardSummaryRequest = (async (): Promise<ApiSummary> =>
  apiGet<ApiSummary>("/api/v1/member-profiles/dashboard/summary")) as () => Promise<ApiSummary>;
