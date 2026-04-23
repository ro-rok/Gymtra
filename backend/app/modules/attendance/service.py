from datetime import date, datetime, timedelta, timezone, tzinfo
from uuid import uuid4
from zoneinfo import ZoneInfo

import jwt
from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.config import get_settings
from app.core.serializers import as_str_id
from app.modules.attendance.repository import AttendanceRepository
from app.modules.attendance.schemas import (
    AttendanceDayResponse,
    AttendanceRecord,
    DailyTaskRecord,
    MemberDashboardAttendanceTasksResponse,
    MemberTaskStats,
    QrTokenResponse,
)
from app.modules.notifications.service import NotificationsService


class AttendanceService:
    CHECKIN_RATE_LIMIT_SECONDS = 15
    DEFAULT_TIMEZONE = "Asia/Kolkata"

    def __init__(self, db: Database):
        self.db = db
        self.repo = AttendanceRepository(db)
        self.settings = get_settings()

    def _gym_timezone(self, gym_id: ObjectId) -> tzinfo:
        gym = self.db.gyms.find_one({"_id": gym_id}, {"timezone": 1})
        timezone_name = (gym or {}).get("timezone") or self.DEFAULT_TIMEZONE
        try:
            return ZoneInfo(timezone_name)
        except Exception:
            # On Windows/Python builds without tzdata, ZoneInfo may fail.
            # Fall back to fixed IST offset for attendance date consistency.
            return timezone(timedelta(hours=5, minutes=30))

    def _day_key(self, *, gym_id: ObjectId, value: date | None = None) -> str:
        if value is not None:
            return value.isoformat()
        return datetime.now(self._gym_timezone(gym_id)).date().isoformat()

    @staticmethod
    def _to_attendance(row: dict) -> AttendanceRecord:
        return AttendanceRecord(
            id=as_str_id(row.get("_id")) or "",
            memberId=as_str_id(row.get("member_id")) or "",
            gymId=as_str_id(row.get("gym_id")) or "",
            date=row.get("day_key", ""),
            status=row.get("status", "present"),
            markedBy=as_str_id(row.get("marked_by")) or "",
            source=row.get("source", "manual"),
            trustLevel=row.get("trust_level", "high"),
        )

    @staticmethod
    def _to_daily_task(row: dict) -> DailyTaskRecord:
        return DailyTaskRecord(
            id=as_str_id(row.get("_id")) or "",
            memberId=as_str_id(row.get("member_id")) or "",
            gymId=as_str_id(row.get("gym_id")) or "",
            date=row.get("day_key", ""),
            workout=bool(row.get("workout")),
            meal=bool(row.get("meal")),
            water=bool(row.get("water")),
            waterLiters=float(row.get("water_liters") or 0),
        )

    @staticmethod
    def _resolve_actor_gym(actor: dict) -> ObjectId:
        gym_id = actor.get("gym_id")
        if not gym_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gym context is required")
        return gym_id

    @staticmethod
    def _as_utc(dt: datetime | None) -> datetime | None:
        if not isinstance(dt, datetime):
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    def _ensure_member_in_gym(self, *, member_id: str, gym_id: ObjectId) -> ObjectId:
        if not ObjectId.is_valid(member_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        member_oid = ObjectId(member_id)
        member = self.db.users.find_one({"_id": member_oid, "gym_id": gym_id, "role": "member"})
        if not member:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        return member_oid

    def mark_attendance(
        self, *, actor: dict, member_id: str, day: date | None, status_text: str, source: str = "manual"
    ) -> AttendanceRecord:
        gym_id = self._resolve_actor_gym(actor)
        member_oid = self._ensure_member_in_gym(member_id=member_id, gym_id=gym_id)
        day_key = self._day_key(gym_id=gym_id, value=day)
        row = self.repo.upsert_attendance(
            gym_id=gym_id,
            member_id=member_oid,
            day_key=day_key,
            status=status_text,
            marked_by=actor.get("_id"),
            source=source,
            trust_level="low" if source == "static_qr" else "high",
        )
        if self.repo.count_attendance_records(gym_id=gym_id, member_id=member_oid, day_key=day_key) > 1:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Conflicting attendance records found for day")
        return self._to_attendance(row)

    def list_day_attendance(self, *, actor: dict, day: date | None) -> AttendanceDayResponse:
        gym_id = self._resolve_actor_gym(actor)
        day_key = self._day_key(gym_id=gym_id, value=day)
        rows = self.repo.get_attendance_for_day(gym_id=gym_id, day_key=day_key)
        return AttendanceDayResponse(date=day_key, items=[self._to_attendance(row) for row in rows])

    def member_self_checkin(self, *, actor: dict, day: date | None = None) -> AttendanceRecord:
        if actor.get("role") != "member":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only members can self check-in")
        return self.mark_attendance(
            actor=actor,
            member_id=as_str_id(actor.get("_id")) or "",
            day=day,
            status_text="present",
            source="member_self",
        )

    def create_qr_token(self, *, actor: dict) -> QrTokenResponse:
        gym_id = self._resolve_actor_gym(actor)
        now = datetime.now(timezone.utc)
        ttl_seconds = min(self.settings.qr_token_ttl_seconds, 60)
        expires = now + timedelta(seconds=ttl_seconds)
        payload = {
            "gym_id": as_str_id(gym_id),
            "nonce": uuid4().hex,
            "iat": int(now.timestamp()),
            "exp": int(expires.timestamp()),
        }
        token = jwt.encode(payload, self.settings.qr_token_secret, algorithm=self.settings.jwt_algorithm)
        return QrTokenResponse(token=token, expiresAt=expires.isoformat())

    def _enforce_checkin_rate_limit(self, *, gym_id: ObjectId, member_id: ObjectId, day_key: str) -> None:
        row = self.repo.get_attendance(gym_id=gym_id, member_id=member_id, day_key=day_key)
        if not row:
            return
        updated_at = self._as_utc(row.get("updated_at") or row.get("created_at"))
        if not updated_at:
            return
        if (datetime.now(timezone.utc) - updated_at).total_seconds() < self.CHECKIN_RATE_LIMIT_SECONDS:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Check-in attempted too frequently")

    def verify_qr_and_checkin(self, *, actor: dict, token: str | None, mode: str = "dynamic") -> AttendanceRecord:
        if actor.get("role") != "member":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only members can verify QR")
        gym_id = self._resolve_actor_gym(actor)
        member_id = as_str_id(actor.get("_id")) or ""
        member_oid = self._ensure_member_in_gym(member_id=member_id, gym_id=gym_id)
        day_key = self._day_key(gym_id=gym_id)
        self._enforce_checkin_rate_limit(gym_id=gym_id, member_id=member_oid, day_key=day_key)
        if mode == "static":
            return self.mark_attendance(
                actor=actor,
                member_id=member_id,
                day=None,
                status_text="present",
                source="static_qr",
            )
        if not token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="QR token is required")
        try:
            payload = jwt.decode(token, self.settings.qr_token_secret, algorithms=[self.settings.jwt_algorithm])
        except jwt.InvalidTokenError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired QR token") from exc
        if payload.get("gym_id") != as_str_id(gym_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="QR token is not valid for this gym")
        nonce = payload.get("nonce")
        if not isinstance(nonce, str) or not nonce:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="QR token payload is invalid")
        expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        if not self.repo.consume_qr_nonce(gym_id=gym_id, nonce=nonce, expires_at=expires_at):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="QR token already consumed")
        return self.mark_attendance(
            actor=actor,
            member_id=member_id,
            day=None,
            status_text="present",
            source="qr",
        )

    def upsert_daily_task(
        self,
        *,
        actor: dict,
        member_id: str,
        day: date,
        workout: bool,
        meal: bool,
        water: bool,
        water_liters: float | None,
    ) -> DailyTaskRecord:
        gym_id = self._resolve_actor_gym(actor)
        if actor.get("role") == "member":
            member_id = as_str_id(actor.get("_id")) or ""
        member_oid = self._ensure_member_in_gym(member_id=member_id, gym_id=gym_id)
        row = self.repo.upsert_daily_task(
            gym_id=gym_id,
            member_id=member_oid,
            day_key=self._day_key(gym_id=gym_id, value=day),
            workout=workout,
            meal=meal,
            water=water,
            water_liters=float(water_liters or 0),
        )
        if actor.get("role") == "member":
            NotificationsService(self.db).send_daily_task_reminder_if_needed(
                gym_id=as_str_id(gym_id) or "",
                user_id=as_str_id(member_oid) or "",
                day_key=self._day_key(gym_id=gym_id, value=day),
                task_row=row,
            )
        return self._to_daily_task(row)

    def member_dashboard_data(self, *, actor: dict) -> MemberDashboardAttendanceTasksResponse:
        if actor.get("role") != "member":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only members can access this dashboard data")
        gym_id = self._resolve_actor_gym(actor)
        member_oid = ObjectId(actor["_id"])
        day_key = self._day_key(gym_id=gym_id)
        attendance_rows = self.repo.get_member_attendance(gym_id=gym_id, member_id=member_oid, limit=120)
        task_rows = self.repo.get_daily_tasks_for_member(gym_id=gym_id, member_id=member_oid, limit=120)
        today_task = self.repo.get_daily_task(gym_id=gym_id, member_id=member_oid, day_key=day_key)

        present_days = {row.get("day_key") for row in attendance_rows if row.get("status") == "present"}
        completed_days = {
            row.get("day_key")
            for row in task_rows
            if row.get("workout") and row.get("meal") and row.get("water")
        }
        today = datetime.now(self._gym_timezone(gym_id)).date()
        month_prefix = today.strftime("%Y-%m")
        skipped_days_this_month = len(
            [row for row in attendance_rows if row.get("day_key", "").startswith(month_prefix) and row.get("status") == "skipped"]
        )
        absent_days_30 = 0
        for delta in range(30):
            d = (today - timedelta(days=delta)).isoformat()
            if d not in present_days:
                absent_days_30 += 1
        long_absent = absent_days_30 >= 30

        streak = 0
        cursor = today
        while cursor.isoformat() in completed_days:
            streak += 1
            cursor -= timedelta(days=1)

        return MemberDashboardAttendanceTasksResponse(
            todayTasks=self._to_daily_task(today_task) if today_task else None,
            attendance=[self._to_attendance(row) for row in attendance_rows],
            stats=MemberTaskStats(
                streak=streak,
                completedDays=len(completed_days),
                skippedDaysThisMonth=skipped_days_this_month,
                absentDays30=absent_days_30,
                longAbsent=long_absent,
            ),
        )

