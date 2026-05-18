from typing import Literal

from pydantic import BaseModel, Field

WATER_REMINDER_START_HOUR = 8
WATER_REMINDER_END_HOUR = 22


def hourly_water_times() -> list[str]:
    return [f"{hour:02d}:00" for hour in range(WATER_REMINDER_START_HOUR, WATER_REMINDER_END_HOUR + 1)]


DEFAULT_WATER_TIMES = hourly_water_times()
LEGACY_WATER_TIMES = ["10:00", "14:00", "18:00"]
DEFAULT_MEAL_TIMES = {"breakfast": "08:00", "lunch": "13:00", "dinner": "20:00"}


class MealTimesPreferences(BaseModel):
    breakfast: str = "08:00"
    lunch: str = "13:00"
    dinner: str = "20:00"


class ReminderPreferencesResponse(BaseModel):
    pushEnabled: bool = True
    waterEnabled: bool = True
    dietEnabled: bool = True
    workoutEnabled: bool = True
    waterTimes: list[str] = Field(default_factory=lambda: list(DEFAULT_WATER_TIMES))
    mealTimes: MealTimesPreferences = Field(default_factory=MealTimesPreferences)


class ReminderPreferencesPatch(BaseModel):
    pushEnabled: bool | None = None
    waterEnabled: bool | None = None
    dietEnabled: bool | None = None
    workoutEnabled: bool | None = None
    waterTimes: list[str] | None = None
    mealTimes: MealTimesPreferences | None = None


def default_reminder_preferences() -> dict:
    return {
        "push_enabled": True,
        "water_enabled": True,
        "diet_enabled": True,
        "workout_enabled": True,
        "water_times": list(DEFAULT_WATER_TIMES),
        "meal_times": dict(DEFAULT_MEAL_TIMES),
    }


def merge_reminder_preferences(existing: dict | None, patch: dict) -> dict:
    base = default_reminder_preferences()
    if existing:
        base.update({k: v for k, v in existing.items() if v is not None})
    if patch.get("push_enabled") is not None:
        base["push_enabled"] = patch["push_enabled"]
    if patch.get("water_enabled") is not None:
        base["water_enabled"] = patch["water_enabled"]
    if patch.get("diet_enabled") is not None:
        base["diet_enabled"] = patch["diet_enabled"]
    if patch.get("workout_enabled") is not None:
        base["workout_enabled"] = patch["workout_enabled"]
    if patch.get("water_times") is not None:
        base["water_times"] = patch["water_times"]
    if patch.get("meal_times") is not None:
        merged_meals = {**base.get("meal_times", DEFAULT_MEAL_TIMES), **patch["meal_times"]}
        base["meal_times"] = merged_meals
    return base


def normalize_water_times(times: list[str] | None) -> list[str]:
    if not times or times == LEGACY_WATER_TIMES:
        return list(DEFAULT_WATER_TIMES)
    return list(times)


def reminder_preferences_to_response(doc: dict | None) -> ReminderPreferencesResponse:
    prefs = merge_reminder_preferences(doc, {})
    meal_times = prefs.get("meal_times") or DEFAULT_MEAL_TIMES
    return ReminderPreferencesResponse(
        pushEnabled=bool(prefs.get("push_enabled", True)),
        waterEnabled=bool(prefs.get("water_enabled", True)),
        dietEnabled=bool(prefs.get("diet_enabled", True)),
        workoutEnabled=bool(prefs.get("workout_enabled", True)),
        waterTimes=normalize_water_times(prefs.get("water_times")),
        mealTimes=MealTimesPreferences(
            breakfast=meal_times.get("breakfast", "08:00"),
            lunch=meal_times.get("lunch", "13:00"),
            dinner=meal_times.get("dinner", "20:00"),
        ),
    )


def patch_to_storage(payload: ReminderPreferencesPatch) -> dict:
    data = payload.model_dump(exclude_none=True)
    out: dict = {}
    if "pushEnabled" in data:
        out["push_enabled"] = data["pushEnabled"]
    if "waterEnabled" in data:
        out["water_enabled"] = data["waterEnabled"]
    if "dietEnabled" in data:
        out["diet_enabled"] = data["dietEnabled"]
    if "workoutEnabled" in data:
        out["workout_enabled"] = data["workoutEnabled"]
    if "waterTimes" in data:
        out["water_times"] = data["waterTimes"]
    if "mealTimes" in data:
        mt = data["mealTimes"]
        out["meal_times"] = {
            "breakfast": mt.get("breakfast", "08:00"),
            "lunch": mt.get("lunch", "13:00"),
            "dinner": mt.get("dinner", "20:00"),
        }
    return out
