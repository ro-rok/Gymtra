import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { DietTemplate, MemberDietAssignment } from "@/lib/types";

type ApiDietTemplate = DietTemplate & {
  macros?: { protein?: number; carbs?: number; fat?: number };
  notes?: string;
  preferenceTags?: string[];
  allergyTags?: string[];
  updatedAt: string;
};

export const listDietTemplatesRequest = async (): Promise<DietTemplate[]> => {
  const data = await apiGet<{ items: ApiDietTemplate[]; total: number }>("/api/v1/diets/templates");
  return data.items;
};

export const createDietTemplateRequest = (payload: Omit<DietTemplate, "id">) =>
  apiPost<ApiDietTemplate>("/api/v1/diets/templates", payload);

export const updateDietTemplateRequest = (templateId: string, payload: Partial<DietTemplate>) =>
  apiPatch<ApiDietTemplate>(`/api/v1/diets/templates/${templateId}`, payload);

export const assignDietTemplateRequest = (payload: { memberId: string; templateId: string }) =>
  apiPost<MemberDietAssignment>("/api/v1/diets/assignments", payload);

export const getMemberActiveDietRequest = (memberId?: string) =>
  apiGet<{ assignment: MemberDietAssignment | null; template: DietTemplate | null }>("/api/v1/diets/members/active", {
    query: { memberId },
  });

export type MemberMealPlan = {
  nutritionGoal: "loss" | "gain" | "maintain";
  nutritionGoalLabel: string;
  currentWeightKg?: number | null;
  goalWeightKg?: number | null;
  assignedTemplate?: DietTemplate | null;
  todayRecommended?: DietTemplate | null;
  weeklyRecommended: DietTemplate[];
};

export const getMemberMealPlanRequest = (memberId?: string) =>
  apiGet<MemberMealPlan>("/api/v1/diets/members/meal-plan", {
    query: { memberId },
  });

