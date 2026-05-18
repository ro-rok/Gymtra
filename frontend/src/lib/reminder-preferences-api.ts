import { apiGet, apiPatch } from "@/lib/api-client";

export interface MealTimesPreferences {
  breakfast: string;
  lunch: string;
  dinner: string;
}

export interface ReminderPreferences {
  pushEnabled: boolean;
  waterEnabled: boolean;
  dietEnabled: boolean;
  workoutEnabled: boolean;
  waterTimes: string[];
  mealTimes: MealTimesPreferences;
}

export const getReminderPreferencesRequest = () =>
  apiGet<ReminderPreferences>("/api/v1/member-profiles/me/reminder-preferences");

export const updateReminderPreferencesRequest = (payload: Partial<ReminderPreferences>) =>
  apiPatch<ReminderPreferences>("/api/v1/member-profiles/me/reminder-preferences", payload);
