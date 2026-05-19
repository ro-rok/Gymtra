"""
Seed default vegetarian weekly diet templates for one or all gyms.

Usage (from backend/):
  python -m scripts.seed_vegetarian_weekly_diets
  python -m scripts.seed_vegetarian_weekly_diets --gym-slug iron-paradise
"""

import argparse

from bson import ObjectId

from app.db.mongo import get_db
from app.modules.diets.default_templates import ensure_default_diet_templates


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed vegetarian weekly diet templates")
    parser.add_argument("--gym-slug", help="Seed only this gym slug (default: all gyms)")
    args = parser.parse_args()

    db = get_db()
    if args.gym_slug:
        gym = db.gyms.find_one({"slug": args.gym_slug})
        if not gym:
            raise SystemExit(f"Gym not found: {args.gym_slug}")
        gyms = [gym]
    else:
        gyms = list(db.gyms.find({}))

    if not gyms:
        print("No gyms found.")
        return

    total = 0
    for gym in gyms:
        gym_id = gym["_id"]
        count = ensure_default_diet_templates(db, gym_id)
        total += count
        print(f"Seeded {count} templates for {gym.get('name', gym_id)} ({gym.get('slug', '')})")

    print(f"Done. {total} template upserts across {len(gyms)} gym(s).")


if __name__ == "__main__":
    main()
