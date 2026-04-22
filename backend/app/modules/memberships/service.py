from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.audit import log_audit_event
from app.core.serializers import as_str_id
from app.modules.memberships.repository import MembershipsRepository
from app.modules.memberships.schemas import (
    MembershipCreateRequest,
    MembershipListResponse,
    MembershipRenewRequest,
    MembershipResponse,
)


class MembershipsService:
    def __init__(self, db: Database):
        self.db = db
        self.repo = MembershipsRepository(db)

    def _resolve_gym_id(self, actor: dict) -> ObjectId:
        gym_id = actor.get("gym_id")
        if not gym_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gym context is required")
        return gym_id

    def _duration_days(self, plan: str) -> int:
        mapping = {"monthly": 30, "quarterly": 90, "half_yearly": 180}
        return mapping.get(plan, 30)

    def _to_response(self, row: dict) -> MembershipResponse:
        return MembershipResponse(
            id=as_str_id(row.get("_id")) or "",
            memberId=as_str_id(row.get("user_id")) or "",
            gymId=as_str_id(row.get("gym_id")) or "",
            plan=row.get("plan", "monthly"),
            amount=float(row.get("amount", 0)),
            startDate=row.get("start_date").strftime("%Y-%m-%d"),
            endDate=row.get("end_date").strftime("%Y-%m-%d"),
            status=row.get("status", "active"),
            renewedFromId=as_str_id(row.get("renewed_from_id")),
        )

    def _latest_valid_membership(self, *, member_id: ObjectId, gym_id: ObjectId) -> dict | None:
        return self.db.memberships.find_one(
            {"gym_id": gym_id, "user_id": member_id},
            sort=[("end_date", -1), ("created_at", -1)],
        )

    def _enforce_single_active_membership(self, *, member_id: ObjectId, gym_id: ObjectId) -> None:
        active_rows = list(self.db.memberships.find({"gym_id": gym_id, "user_id": member_id, "status": "active"}).sort("created_at", -1))
        if len(active_rows) <= 1:
            return
        latest_id = active_rows[0].get("_id")
        self.db.memberships.update_many(
            {"gym_id": gym_id, "user_id": member_id, "status": "active", "_id": {"$ne": latest_id}},
            {"$set": {"status": "expired", "updated_at": datetime.now(timezone.utc)}},
        )

    def _sync_member_status_from_membership(self, *, member_id: ObjectId, gym_id: ObjectId) -> None:
        latest = self._latest_valid_membership(member_id=member_id, gym_id=gym_id)
        if not latest:
            self.repo.update_member_status(member_id, gym_id, "inactive")
            return
        now = datetime.now(timezone.utc)
        end_date = latest.get("end_date")
        latest_status = latest.get("status")
        is_active = latest_status == "active" and isinstance(end_date, datetime) and end_date >= now
        self.repo.update_member_status(member_id, gym_id, "active" if is_active else "inactive")

    def create_membership(self, actor: dict, payload: MembershipCreateRequest) -> MembershipResponse:
        gym_id = self._resolve_gym_id(actor)
        if not ObjectId.is_valid(payload.memberId):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        member_id = ObjectId(payload.memberId)
        if not self.repo.get_member(member_id, gym_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        start_dt = datetime.combine(payload.startDate, datetime.min.time(), tzinfo=timezone.utc) if payload.startDate else datetime.now(timezone.utc)
        end_dt = start_dt + timedelta(days=self._duration_days(payload.plan))
        self.repo.expire_active_memberships(member_id, gym_id)
        membership = self.repo.create_membership(
            {
                "user_id": member_id,
                "gym_id": gym_id,
                "plan": payload.plan,
                "amount": payload.amount,
                "start_date": start_dt,
                "end_date": end_dt,
                "status": "active",
                "renewed_from_id": None,
                "created_by": actor.get("_id"),
            }
        )
        self._enforce_single_active_membership(member_id=member_id, gym_id=gym_id)
        self._sync_member_status_from_membership(member_id=member_id, gym_id=gym_id)
        log_audit_event(
            self.db,
            action="memberships.create",
            actor_user_id=as_str_id(actor.get("_id")),
            target_type="membership",
            target_id=as_str_id(membership.get("_id")),
        )
        return self._to_response(membership)

    def renew_membership(self, actor: dict, member_id: str, payload: MembershipRenewRequest) -> MembershipResponse:
        gym_id = self._resolve_gym_id(actor)
        if not ObjectId.is_valid(member_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        member_oid = ObjectId(member_id)
        if not self.repo.get_member(member_oid, gym_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        latest = self._latest_valid_membership(member_id=member_oid, gym_id=gym_id)
        start_dt = datetime.combine(payload.startDate, datetime.min.time(), tzinfo=timezone.utc) if payload.startDate else datetime.now(timezone.utc)
        end_dt = start_dt + timedelta(days=self._duration_days(payload.plan))
        self.repo.expire_active_memberships(member_oid, gym_id)
        membership = self.repo.create_membership(
            {
                "user_id": member_oid,
                "gym_id": gym_id,
                "plan": payload.plan,
                "amount": payload.amount,
                "start_date": start_dt,
                "end_date": end_dt,
                "status": "active",
                "renewed_from_id": latest.get("_id") if latest else None,
                "created_by": actor.get("_id"),
            }
        )
        self._enforce_single_active_membership(member_id=member_oid, gym_id=gym_id)
        self._sync_member_status_from_membership(member_id=member_oid, gym_id=gym_id)
        log_audit_event(
            self.db,
            action="memberships.renew",
            actor_user_id=as_str_id(actor.get("_id")),
            target_type="membership",
            target_id=as_str_id(membership.get("_id")),
            metadata={"member_id": member_id},
        )
        return self._to_response(membership)

    def list_memberships(self, actor: dict, status_filter: str | None, expiring_only: bool, expired_only: bool) -> MembershipListResponse:
        gym_id = self._resolve_gym_id(actor)
        rows = self.repo.list_memberships(gym_id, status_filter, expiring_only, expired_only)
        return MembershipListResponse(items=[self._to_response(row) for row in rows], total=len(rows))
