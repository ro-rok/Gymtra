from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from bson import ObjectId
from fastapi import HTTPException, status

from app.core.serializers import as_str_id
from app.modules.notifications.service import NotificationsService
from app.modules.reminders.repository import RemindersRepository
from app.modules.reminders.schemas import ReminderLogItem, ReminderQueueItem, ReminderSendPayload


class RemindersService:
    def __init__(self, repo: RemindersRepository):
        self.repo = repo
        self.notifications = NotificationsService(repo.db)

    @staticmethod
    def _wa_url(phone: str, message: str) -> str:
        digits = "".join([c for c in phone if c.isdigit()])
        return f"https://wa.me/{digits}?text={quote(message)}"

    def _resolve_actor_gym(self, actor: dict) -> ObjectId:
        gym_id = actor.get("gym_id")
        if not gym_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gym context is required")
        return gym_id

    def _latest_membership_by_member(self, memberships: list[dict]) -> dict[str, dict]:
        grouped: dict[str, dict] = {}
        for row in memberships:
            member_id = as_str_id(row.get("user_id")) or ""
            if not member_id:
                continue
            current = grouped.get(member_id)
            if not current or row.get("created_at", datetime.min.replace(tzinfo=timezone.utc)) > current.get("created_at", datetime.min.replace(tzinfo=timezone.utc)):
                grouped[member_id] = row
        return grouped

    def queue(self, actor: dict) -> list[ReminderQueueItem]:
        gym_id = self._resolve_actor_gym(actor)
        members = self.repo.list_members(gym_id)
        memberships = self.repo.list_memberships(gym_id)
        attendance = self.repo.list_recent_attendance(gym_id, days=30)
        latest_membership = self._latest_membership_by_member(memberships)
        present_days: dict[str, set[str]] = {}
        for row in attendance:
            if row.get("status") != "present":
                continue
            member_id = as_str_id(row.get("member_id")) or ""
            if not member_id:
                continue
            present_days.setdefault(member_id, set()).add(row.get("day_key", ""))

        items: list[ReminderQueueItem] = []
        today = datetime.now(timezone.utc).date()
        month_ago = (today - timedelta(days=30)).isoformat()
        for member in members:
            member_id = as_str_id(member.get("_id")) or ""
            if not member_id:
                continue
            ms = latest_membership.get(member_id)
            phone = member.get("phone", "")
            name = member.get("name", "Member")
            if not phone:
                continue
            if ms:
                end_date_raw = ms.get("end_date")
                try:
                    end_date = end_date_raw.date() if hasattr(end_date_raw, "date") else datetime.fromisoformat(str(end_date_raw)).date()
                except Exception:
                    end_date = None
                if end_date:
                    if end_date < today:
                        msg = f"Hi {name}, your membership expired on {end_date.isoformat()}. Renew to continue your progress."
                        items.append(ReminderQueueItem(memberId=member_id, gymId=as_str_id(gym_id) or "", memberName=name, phone=phone, type="overdue", message=msg, waUrl=self._wa_url(phone, msg)))
                    elif end_date <= today + timedelta(days=5):
                        msg = f"Hey {name}, your membership ends on {end_date.isoformat()}. Renew before expiry to avoid interruption."
                        items.append(ReminderQueueItem(memberId=member_id, gymId=as_str_id(gym_id) or "", memberName=name, phone=phone, type="expiry", message=msg, waUrl=self._wa_url(phone, msg)))

            seen = present_days.get(member_id, set())
            if today.isoformat() not in seen:
                msg = f"Hey {name}, we missed you today. Even a short session counts."
                items.append(ReminderQueueItem(memberId=member_id, gymId=as_str_id(gym_id) or "", memberName=name, phone=phone, type="missed_workout", message=msg, waUrl=self._wa_url(phone, msg)))
            if not any(day >= month_ago for day in seen):
                msg = f"Hi {name}, it's been a while since your last workout. We'd love to have you back this week."
                items.append(ReminderQueueItem(memberId=member_id, gymId=as_str_id(gym_id) or "", memberName=name, phone=phone, type="absence", message=msg, waUrl=self._wa_url(phone, msg)))
        return items

    def logs(self, actor: dict) -> list[ReminderLogItem]:
        gym_id = as_str_id(self._resolve_actor_gym(actor)) or ""
        rows = self.repo.list_notification_logs(gym_id)
        return [
            ReminderLogItem(
                id=as_str_id(row.get("_id")) or "",
                gymId=row.get("gym_id", ""),
                userId=row.get("user_id", ""),
                eventType=row.get("event_type", ""),
                status=row.get("status", ""),
                channel=row.get("channel"),
                message=row.get("message"),
                createdAt=row.get("created_at").isoformat() if row.get("created_at") else "",
            )
            for row in rows
        ]

    def send(self, actor: dict, payload: ReminderSendPayload) -> dict:
        gym_id = as_str_id(self._resolve_actor_gym(actor)) or ""
        self.repo.create_log(
            {
                "gym_id": gym_id,
                "user_id": payload.memberId,
                "event_type": payload.type,
                "status": "sent",
                "channel": payload.channel,
                "message": payload.message,
            }
        )
        if payload.channel == "push":
            self.notifications.send_event(
                event_type=payload.type,
                title="Gymtra Reminder",
                body=payload.message,
                gym_id=gym_id,
                user_id=payload.memberId,
            )
        return {"success": True}
