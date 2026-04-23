import type { Gym, PlanType } from "@/lib/types";

export const DEFAULT_PLAN_PRICING: Record<PlanType, number> = {
  Monthly: 1500,
  Quarterly: 4000,
  "Half-Yearly": 7000,
};

export const getGymPlanPricing = (gym: Gym | null | undefined): Record<PlanType, number> => ({
  Monthly: gym?.planPricing?.monthly ?? DEFAULT_PLAN_PRICING.Monthly,
  Quarterly: gym?.planPricing?.quarterly ?? DEFAULT_PLAN_PRICING.Quarterly,
  "Half-Yearly": gym?.planPricing?.halfYearly ?? DEFAULT_PLAN_PRICING["Half-Yearly"],
});

