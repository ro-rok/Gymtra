"""Derive nutrition goal from current vs target body weight."""

from typing import Literal

DietGoal = Literal["loss", "gain", "maintain"]

WEIGHT_TOLERANCE_KG = 0.5

GOAL_LABELS: dict[DietGoal, str] = {
    "loss": "Weight loss (cutting)",
    "gain": "Weight gain",
    "maintain": "Maintenance",
}


def derive_nutrition_goal(
    current_kg: float | None,
    goal_kg: float | None,
) -> DietGoal:
    if current_kg is None or goal_kg is None:
        return "maintain"
    if abs(current_kg - goal_kg) <= WEIGHT_TOLERANCE_KG:
        return "maintain"
    if current_kg < goal_kg:
        return "gain"
    return "loss"


def nutrition_goal_label(goal: DietGoal) -> str:
    return GOAL_LABELS.get(goal, "Maintenance")
