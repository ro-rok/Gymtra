export type NutritionGoal = "loss" | "gain" | "maintain";

const WEIGHT_TOLERANCE_KG = 0.5;

export const NUTRITION_GOAL_LABELS: Record<NutritionGoal, string> = {
  loss: "Weight loss (cutting)",
  gain: "Weight gain",
  maintain: "Maintenance",
};

export function deriveNutritionGoal(
  currentKg?: number | null,
  goalKg?: number | null,
): NutritionGoal {
  if (currentKg == null || goalKg == null) {
    return "maintain";
  }
  if (Math.abs(currentKg - goalKg) <= WEIGHT_TOLERANCE_KG) {
    return "maintain";
  }
  if (currentKg < goalKg) {
    return "gain";
  }
  return "loss";
}

export function nutritionGoalLabel(goal: NutritionGoal): string {
  return NUTRITION_GOAL_LABELS[goal] ?? "Maintenance";
}
