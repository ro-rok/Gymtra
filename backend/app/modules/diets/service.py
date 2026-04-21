from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.audit import log_audit_event
from app.core.serializers import as_str_id
from app.modules.diets.repository import DietsRepository
from app.modules.diets.schemas import (
    DietAssignmentResponse,
    DietMacros,
    DietTemplateCreateRequest,
    DietTemplateListResponse,
    DietTemplateResponse,
    DietTemplateUpdateRequest,
    MemberActiveDietResponse,
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

