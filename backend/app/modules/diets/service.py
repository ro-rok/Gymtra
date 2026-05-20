from datetime import datetime, timezone
from uuid import uuid4

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.audit import log_audit_event
from app.core.serializers import as_str_id
from app.modules.diets.default_templates import ensure_default_diet_templates
from app.modules.diets.repository import DietsRepository
from app.core.datetime_ist import get_ist_weekday
from app.modules.diets.nutrition_goal import derive_nutrition_goal, nutrition_goal_label
from app.modules.diets.schemas import (
    DietConsumedTotals,
    DietCustomMeal,
    DietCustomMealCreateRequest,
    DietCustomMealDeleteRequest,
    DietAssignmentResponse,
    DietMacroSeriesItem,
    DietMacroSeriesResponse,
    DietMealToggleRequest,
    DietMealToggleResponse,
    DietMacros,
    DietTemplateCreateRequest,
    DietTemplateListResponse,
    DietTemplateResponse,
    DietTemplateUpdateRequest,
    MemberActiveDietResponse,
    MemberMealPlanResponse,
)


class DietsService:
    def __init__(self, db: Database):
        self.db = db
        self.repo = DietsRepository(db)

    @staticmethod
    def _resolve_actor_gym(actor: dict) -> ObjectId:
        gym_id = actor.get("gym_id")
        if not gym_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gym context is required")
        return gym_id

    def _ensure_member_in_gym(self, member_id: str, gym_id: ObjectId) -> ObjectId:
        if not ObjectId.is_valid(member_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        member_oid = ObjectId(member_id)
        member = self.db.users.find_one({"_id": member_oid, "gym_id": gym_id, "role": "member"})
        if not member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        return member_oid

    @staticmethod
    def _to_template(row: dict) -> DietTemplateResponse:
        macros = row.get("macros")
        return DietTemplateResponse(
            id=as_str_id(row.get("_id")) or "",
            gymId=as_str_id(row.get("gym_id")) or "",
            name=row.get("name", ""),
            goal=row.get("goal", "maintain"),
            weekday=row.get("weekday"),
            calories=int(row.get("calories") or 0),
            meals=int(row.get("meals") or 0),
            tags=row.get("tags") or [],
            mealPlan=row.get("meal_plan") or [],
            macros=DietMacros(**macros) if isinstance(macros, dict) else None,
            notes=row.get("notes"),
            preferenceTags=row.get("preference_tags") or [],
            allergyTags=row.get("allergy_tags") or [],
            createdBy=as_str_id(row.get("created_by")) or "",
            updatedAt=(row.get("updated_at") or datetime.now(timezone.utc)).isoformat(),
        )

    @staticmethod
    def _to_assignment(row: dict) -> DietAssignmentResponse:
        return DietAssignmentResponse(
            id=as_str_id(row.get("_id")) or "",
            memberId=as_str_id(row.get("member_id")) or "",
            templateId=as_str_id(row.get("template_id")) or "",
            gymId=as_str_id(row.get("gym_id")) or "",
            assignedBy=as_str_id(row.get("assigned_by")) or "",
            assignedAt=(row.get("assigned_at") or datetime.now(timezone.utc)).isoformat(),
            active=bool(row.get("active")),
        )

    def create_template(self, actor: dict, payload: DietTemplateCreateRequest) -> DietTemplateResponse:
        gym_id = self._resolve_actor_gym(actor)
        row = self.repo.create_template(
            {
                "gym_id": gym_id,
                "name": payload.name,
                "goal": payload.goal,
                "weekday": payload.weekday,
                "calories": payload.calories,
                "meals": payload.meals,
                "tags": payload.tags,
                "meal_plan": [m.model_dump() for m in payload.mealPlan],
                "macros": payload.macros.model_dump() if payload.macros else None,
                "notes": payload.notes,
                "preference_tags": payload.preferenceTags,
                "allergy_tags": payload.allergyTags,
                "created_by": actor.get("_id"),
            }
        )
        log_audit_event(self.db, action="diet.template.create", actor_user_id=as_str_id(actor.get("_id")))
        return self._to_template(row)

    def update_template(self, actor: dict, template_id: str, payload: DietTemplateUpdateRequest) -> DietTemplateResponse:
        gym_id = self._resolve_actor_gym(actor)
        if not ObjectId.is_valid(template_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diet template not found")
        update_data = payload.model_dump(exclude_none=True)
        if "mealPlan" in update_data:
            update_data["meal_plan"] = [m.model_dump() for m in payload.mealPlan or []]
            update_data.pop("mealPlan", None)
        if "preferenceTags" in update_data:
            update_data["preference_tags"] = update_data.pop("preferenceTags")
        if "allergyTags" in update_data:
            update_data["allergy_tags"] = update_data.pop("allergyTags")
        if "macros" in update_data and payload.macros:
            update_data["macros"] = payload.macros.model_dump()
        row = self.repo.update_template(ObjectId(template_id), gym_id, update_data)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diet template not found")
        log_audit_event(self.db, action="diet.template.update", actor_user_id=as_str_id(actor.get("_id")), target_id=template_id)
        return self._to_template(row)

    def list_templates(self, actor: dict) -> DietTemplateListResponse:
        gym_id = self._resolve_actor_gym(actor)
        rows = self.repo.list_templates(gym_id)
        return DietTemplateListResponse(items=[self._to_template(row) for row in rows], total=len(rows))

    def assign_template(self, actor: dict, member_id: str, template_id: str) -> DietAssignmentResponse:
        gym_id = self._resolve_actor_gym(actor)
        member_oid = self._ensure_member_in_gym(member_id, gym_id)
        if not ObjectId.is_valid(template_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diet template not found")
        template_oid = ObjectId(template_id)
        if not self.repo.get_template(template_oid, gym_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diet template not found")
        self.repo.deactivate_member_assignments(member_oid, gym_id)
        row = self.repo.create_assignment(
            {
                "member_id": member_oid,
                "template_id": template_oid,
                "gym_id": gym_id,
                "assigned_by": actor.get("_id"),
                "assigned_at": datetime.now(timezone.utc),
                "active": True,
            }
        )
        log_audit_event(self.db, action="diet.assignment.upsert", actor_user_id=as_str_id(actor.get("_id")), target_id=member_id)
        return self._to_assignment(row)

    def get_member_active_diet(self, actor: dict, member_id: str | None) -> MemberActiveDietResponse:
        gym_id = self._resolve_actor_gym(actor)
        target_member_id = member_id
        if actor.get("role") == "member":
            target_member_id = as_str_id(actor.get("_id"))
        if not target_member_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member id is required")
        member_oid = self._ensure_member_in_gym(target_member_id, gym_id)
        assignment = self.repo.get_active_assignment(member_oid, gym_id)
        if not assignment:
            return MemberActiveDietResponse()
        template = self.repo.get_template(assignment["template_id"], gym_id)
        return MemberActiveDietResponse(
            assignment=self._to_assignment(assignment),
            template=self._to_template(template) if template else None,
        )

    def _ensure_weekly_library_if_needed(self, gym_id: ObjectId) -> None:
        """Load 21 default vegetarian weekly plans into MongoDB for this gym if missing."""
        has_weekly = self.db.diet_templates.count_documents(
            {"gym_id": gym_id, "weekday": {"$exists": True}},
            limit=1,
        )
        if has_weekly == 0:
            ensure_default_diet_templates(self.db, gym_id)

    def _get_member_weights(self, member_oid: ObjectId, gym_id: ObjectId) -> tuple[float | None, float | None]:
        profile = self.db.member_profiles.find_one({"user_id": member_oid, "gym_id": gym_id})
        if not profile:
            return None, None
        current = profile.get("current_weight_kg")
        goal = profile.get("goal_weight_kg")
        return (
            float(current) if current is not None else None,
            float(goal) if goal is not None else None,
        )

    @staticmethod
    def _resolve_day_key(day: str | None) -> str:
        if day:
            return day
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    @staticmethod
    def _parse_meal_macros(text: str) -> tuple[float, float, float]:
        import re

        p = re.search(r"P(\d+(?:\.\d+)?)", text or "")
        c = re.search(r"C(\d+(?:\.\d+)?)", text or "")
        f = re.search(r"F(\d+(?:\.\d+)?)", text or "")
        return (
            float(p.group(1)) if p else 0.0,
            float(c.group(1)) if c else 0.0,
            float(f.group(1)) if f else 0.0,
        )

    def _daily_logs_and_totals(
        self,
        *,
        gym_id: ObjectId,
        member_oid: ObjectId,
        day_key: str,
        template: DietTemplateResponse | None,
    ) -> tuple[list[int], list[DietCustomMeal], DietConsumedTotals]:
        logs = self.repo.list_meal_logs_for_day(gym_id=gym_id, member_id=member_oid, day_key=day_key)
        completed_indexes: list[int] = []
        custom_meals: list[DietCustomMeal] = []
        totals = DietConsumedTotals()
        template_meals = template.mealPlan if template else []
        for row in logs:
            if row.get("entry_type") == "template":
                idx = int(row.get("meal_index") or 0)
                if bool(row.get("consumed")):
                    completed_indexes.append(idx)
                    if 0 <= idx < len(template_meals):
                        meal = template_meals[idx]
                        p, c, f = self._parse_meal_macros(meal.macros)
                        totals.calories += float(meal.cal or 0)
                        totals.protein += p
                        totals.carbs += c
                        totals.fat += f
            elif row.get("entry_type") == "custom":
                custom = DietCustomMeal(
                    mealId=as_str_id(row.get("_id")) or "",
                    name=row.get("meal_name", ""),
                    time=row.get("meal_time"),
                    calories=float(row.get("calories") or 0),
                    protein=float(row.get("protein") or 0),
                    carbs=float(row.get("carbs") or 0),
                    fat=float(row.get("fat") or 0),
                    note=row.get("note"),
                    consumedAt=(row.get("created_at") or datetime.now(timezone.utc)).isoformat(),
                )
                custom_meals.append(custom)
                totals.calories += custom.calories
                totals.protein += custom.protein
                totals.carbs += custom.carbs
                totals.fat += custom.fat
        return sorted(set(completed_indexes)), custom_meals, totals

    def get_member_meal_plan(self, actor: dict, member_id: str | None) -> MemberMealPlanResponse:
        gym_id = self._resolve_actor_gym(actor)
        target_member_id = member_id
        if actor.get("role") == "member":
            target_member_id = as_str_id(actor.get("_id"))
        if not target_member_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member id is required")
        member_oid = self._ensure_member_in_gym(target_member_id, gym_id)

        self._ensure_weekly_library_if_needed(gym_id)

        current_kg, goal_kg = self._get_member_weights(member_oid, gym_id)
        nutrition_goal = derive_nutrition_goal(current_kg, goal_kg)

        active = self.get_member_active_diet(actor, target_member_id)
        assigned_template = active.template

        weekly_rows = self.repo.list_templates_for_goal_week(gym_id, nutrition_goal)
        weekly_recommended = [self._to_template(row) for row in weekly_rows]

        today_weekday = get_ist_weekday()
        today_row = self.repo.get_template_for_day(gym_id, nutrition_goal, today_weekday)
        today_recommended = self._to_template(today_row) if today_row else None
        day_key = self._resolve_day_key(None)
        tracking_template = assigned_template or today_recommended
        completed_indexes, custom_meals, consumed_totals = self._daily_logs_and_totals(
            gym_id=gym_id,
            member_oid=member_oid,
            day_key=day_key,
            template=tracking_template,
        )

        return MemberMealPlanResponse(
            nutritionGoal=nutrition_goal,
            nutritionGoalLabel=nutrition_goal_label(nutrition_goal),
            currentWeightKg=current_kg,
            goalWeightKg=goal_kg,
            assignedTemplate=assigned_template,
            todayRecommended=today_recommended,
            weeklyRecommended=weekly_recommended,
            completedMealIndexes=completed_indexes,
            customMeals=custom_meals,
            consumedTotals=consumed_totals,
        )

    def toggle_meal_log(self, actor: dict, payload: DietMealToggleRequest) -> DietMealToggleResponse:
        gym_id = self._resolve_actor_gym(actor)
        target_member_id = payload.memberId
        if actor.get("role") == "member":
            target_member_id = as_str_id(actor.get("_id"))
        if not target_member_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member id is required")
        member_oid = self._ensure_member_in_gym(target_member_id, gym_id)
        day_key = self._resolve_day_key(payload.day)

        self.repo.upsert_meal_check(
            gym_id=gym_id,
            member_id=member_oid,
            day_key=day_key,
            meal_index=payload.mealIndex,
            consumed=payload.consumed,
        )

        plan = self.get_member_meal_plan(actor, target_member_id)
        return DietMealToggleResponse(
            day=day_key,
            completedMealIndexes=plan.completedMealIndexes,
            consumedTotals=plan.consumedTotals,
        )

    def add_custom_meal(self, actor: dict, payload: DietCustomMealCreateRequest) -> MemberMealPlanResponse:
        gym_id = self._resolve_actor_gym(actor)
        target_member_id = payload.memberId
        if actor.get("role") == "member":
            target_member_id = as_str_id(actor.get("_id"))
        if not target_member_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member id is required")
        member_oid = self._ensure_member_in_gym(target_member_id, gym_id)
        day_key = self._resolve_day_key(payload.day)
        self.repo.add_custom_meal(
            gym_id=gym_id,
            member_id=member_oid,
            day_key=day_key,
            payload={
                "meal_uid": uuid4().hex,
                "meal_name": payload.name,
                "meal_time": payload.time,
                "calories": float(payload.calories),
                "protein": float(payload.protein),
                "carbs": float(payload.carbs),
                "fat": float(payload.fat),
                "note": payload.note,
            },
        )
        return self.get_member_meal_plan(actor, target_member_id)

    def delete_custom_meal(self, actor: dict, payload: DietCustomMealDeleteRequest) -> MemberMealPlanResponse:
        gym_id = self._resolve_actor_gym(actor)
        target_member_id = payload.memberId
        if actor.get("role") == "member":
            target_member_id = as_str_id(actor.get("_id"))
        if not target_member_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member id is required")
        member_oid = self._ensure_member_in_gym(target_member_id, gym_id)
        day_key = self._resolve_day_key(payload.day)
        if not ObjectId.is_valid(payload.mealId):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")
        ok = self.repo.delete_custom_meal(
            gym_id=gym_id,
            member_id=member_oid,
            day_key=day_key,
            meal_id=ObjectId(payload.mealId),
        )
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")
        return self.get_member_meal_plan(actor, target_member_id)

    def get_macro_series(self, actor: dict, member_id: str | None, month: str | None) -> DietMacroSeriesResponse:
        gym_id = self._resolve_actor_gym(actor)
        target_member_id = member_id
        if actor.get("role") == "member":
            target_member_id = as_str_id(actor.get("_id"))
        if not target_member_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member id is required")
        member_oid = self._ensure_member_in_gym(target_member_id, gym_id)
        month_key = month or datetime.now(timezone.utc).strftime("%Y-%m")
        rows = self.repo.aggregate_macro_series_for_month(gym_id=gym_id, member_id=member_oid, month=month_key)
        return DietMacroSeriesResponse(
            month=month_key,
            items=[
                DietMacroSeriesItem(
                    day=row.get("_id", ""),
                    calories=float(row.get("calories") or 0),
                    protein=float(row.get("protein") or 0),
                    carbs=float(row.get("carbs") or 0),
                    fat=float(row.get("fat") or 0),
                )
                for row in rows
            ],
        )

