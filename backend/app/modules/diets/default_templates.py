"""Load and upsert default vegetarian weekly diet templates per gym."""

import json
from pathlib import Path

from bson import ObjectId
from pymongo.database import Database

from app.modules.diets.repository import DietsRepository

_DATA_PATH = Path(__file__).resolve().parents[3] / "data" / "vegetarian_weekly_diets.json"


def load_default_weekly_templates() -> list[dict]:
    with _DATA_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def ensure_default_diet_templates(db: Database, gym_id: ObjectId, *, created_by: ObjectId | None = None) -> int:
    """Idempotent upsert of 21 weekly templates. Returns count upserted."""
    repo = DietsRepository(db)
    templates = load_default_weekly_templates()
    count = 0
    for item in templates:
        meal_plan = item.get("mealPlan") or []
        payload = {
            "name": item["name"],
            "calories": item["calories"],
            "meals": item["meals"],
            "tags": item.get("tags") or [],
            "preference_tags": item.get("preferenceTags") or [],
            "allergy_tags": item.get("allergyTags") or [],
            "macros": item.get("macros"),
            "notes": item.get("notes"),
            "meal_plan": [
                {
                    "time": m["time"],
                    "name": m["name"],
                    "cal": m["cal"],
                    "macros": m.get("macros", ""),
                }
                for m in meal_plan
            ],
            "created_by": created_by,
            "is_default_library": True,
        }
        repo.upsert_template_by_day_goal(
            gym_id,
            int(item["weekday"]),
            item["goal"],
            payload,
        )
        count += 1
    return count
