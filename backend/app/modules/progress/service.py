from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.audit import log_audit_event
from app.core.serializers import as_str_id
from app.modules.progress.repository import ProgressRepository
from app.modules.progress.schemas import (
    ProgressListResponse,
    ProgressLogCreateRequest,
    ProgressLogRecord,
    ProgressSeriesPoint,
    ProgressSeriesResponse,
)


class ProgressService:
    def __init__(self, db: Database):
        self.db = db
        self.repo = ProgressRepository(db)

    @staticmethod
    def _resolve_actor_gym(actor: dict) -> ObjectId:
        gym_id = actor.get("gym_id")
        if not gym_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gym context is required")
        return gym_id

    def _resolve_member(self, actor: dict, member_id: str | None, gym_id: ObjectId) -> ObjectId:
        target_member_id = as_str_id(actor.get("_id")) if actor.get("role") == "member" else member_id
        if not target_member_id or not ObjectId.is_valid(target_member_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        member_oid = ObjectId(target_member_id)
        member = self.db.users.find_one({"_id": member_oid, "gym_id": gym_id, "role": "member"})
        if not member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        return member_oid

    @staticmethod
    def _to_record(row: dict) -> ProgressLogRecord:
        return ProgressLogRecord(
            id=as_str_id(row.get("_id")) or "",
            memberId=as_str_id(row.get("member_id")) or "",
            gymId=as_str_id(row.get("gym_id")) or "",
            date=(row.get("log_date") or datetime.now(timezone.utc)).strftime("%Y-%m-%d"),
            weightKg=float(row.get("weight_kg") or 0),
            bodyFatPct=row.get("body_fat_pct"),
            measurements=row.get("measurements"),
            notes=row.get("notes"),
        )

    def add_log(self, actor: dict, payload: ProgressLogCreateRequest) -> ProgressLogRecord:
        if actor.get("role") != "member":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only members can add progress logs")
        gym_id = self._resolve_actor_gym(actor)
        member_oid = self._resolve_member(actor, None, gym_id)
        row = self.repo.create_log(
            {
                "gym_id": gym_id,
                "member_id": member_oid,
                "log_date": datetime.combine(payload.date or datetime.now(timezone.utc).date(), datetime.min.time(), tzinfo=timezone.utc),
                "weight_kg": payload.weightKg,
                "body_fat_pct": payload.bodyFatPct,
                "measurements": payload.measurements,
                "notes": payload.notes,
            }
        )
        log_audit_event(self.db, action="progress.log.create", actor_user_id=as_str_id(actor.get("_id")))
        return self._to_record(row)

    def list_logs(self, actor: dict, member_id: str | None) -> ProgressListResponse:
        gym_id = self._resolve_actor_gym(actor)
        member_oid = self._resolve_member(actor, member_id, gym_id)
        items = [self._to_record(r) for r in self.repo.list_logs(gym_id, member_oid)]
        return ProgressListResponse(items=items, total=len(items))

    def series(self, actor: dict, member_id: str | None) -> ProgressSeriesResponse:
        rows = self.list_logs(actor, member_id).items
        points = [
            ProgressSeriesPoint(
                date=item.date,
                weightKg=item.weightKg,
                bodyFatPct=item.bodyFatPct,
                measurements=item.measurements,
            )
            for item in rows
        ]
        first_weight = points[0].weightKg if points else None
        latest_weight = points[-1].weightKg if points else None
        delta = (latest_weight - first_weight) if (first_weight is not None and latest_weight is not None) else 0
        return ProgressSeriesResponse(
            points=points,
            firstWeight=first_weight,
            latestWeight=latest_weight,
            deltaWeight=delta,
        )

