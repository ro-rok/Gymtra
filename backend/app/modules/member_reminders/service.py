import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from bson import ObjectId
from pymongo.database import Database

from app.modules.member_profiles.reminder_preferences import (
    DEFAULT_MEAL_TIMES,
    WATER_REMINDER_END_HOUR,
    WATER_REMINDER_START_HOUR,
)
from app.modules.member_reminders.repository import MemberRemindersRepository
from app.modules.notifications.service import NotificationsService

logger = logging.getLogger(__name__)

REMINDER_COPY: dict[str, tuple[str, str]] = {
    "water": ("Stay hydrated", "Log your water intake to keep today's streak going."),
    "meal_breakfast": ("Breakfast reminder", "Don't skip breakfast - log your meal when you're done."),
    "meal_lunch": ("Lunch reminder", "Time for lunch - mark your diet task complete after eating."),
    "meal_dinner": ("Dinner reminder", "Evening meal check-in - log dinner to close out your day."),
}

# Meal / pre-meal: match within ±12 min of target (scheduler runs every 1 min).
WINDOW_TOLERANCE_MINUTES = 12


class MemberRemindersService:
    def __init__(self, db: Database):
        self.db = db
        self.repo = MemberRemindersRepository(db)
        self.notifications = NotificationsService(db)

    @staticmethod
    def _parse_hhmm(value: str) -> tuple[int, int] | None:
        try:
            parts = value.strip().split(":")
            return int(parts[0]), int(parts[1])
        except (ValueError, IndexError):
            return None

    @staticmethod
    def _minutes_since_midnight(hour: int, minute: int) -> int:
        return hour * 60 + minute

    def _water_reminder_window_index(self, now_local: datetime) -> int | None:
        """One water reminder per clock hour (8–23). Any minute in that hour may trigger;
        dedupe_key water:{day}:{slot} ensures at most one successful send per hour."""
        hour = now_local.hour
        if hour < WATER_REMINDER_START_HOUR or hour > WATER_REMINDER_END_HOUR:
            return None
        return hour - WATER_REMINDER_START_HOUR

    def _is_in_window(self, *, now_local: datetime, target_hhmm: str) -> tuple[bool, int]:
        parsed = self._parse_hhmm(target_hhmm)
        if not parsed:
            return False, -1
        target_minutes = self._minutes_since_midnight(parsed[0], parsed[1])
        current_minutes = self._minutes_since_midnight(now_local.hour, now_local.minute)
        diff = abs(current_minutes - target_minutes)
        if diff > WINDOW_TOLERANCE_MINUTES:
            return False, -1
        return True, target_minutes

    def _is_pre_meal_window(self, *, now_local: datetime, meal_hhmm: str) -> tuple[bool, int]:
        parsed = self._parse_hhmm(meal_hhmm)
        if not parsed:
            return False, -1
        meal_minutes = self._minutes_since_midnight(parsed[0], parsed[1])
        reminder_minutes = meal_minutes - 30
        if reminder_minutes < 0:
            reminder_minutes += 24 * 60
        current_minutes = self._minutes_since_midnight(now_local.hour, now_local.minute)
        diff = abs(current_minutes - reminder_minutes)
        if diff > WINDOW_TOLERANCE_MINUTES:
            return False, -1
        return True, reminder_minutes

    def _should_skip_water(self, task: dict | None) -> bool:
        if not task:
            return False
        if task.get("water"):
            return True
        return float(task.get("water_liters") or 0) >= self.repo.WATER_GOAL_LITERS

    def _should_skip_meal(self, task: dict | None, slot: str) -> bool:
        if not task:
            return False
        if task.get("meal"):
            return True
        field = {"breakfast": "meal_breakfast", "lunch": "meal_lunch", "dinner": "meal_dinner"}[slot]
        return bool(task.get(field))

    def _dispatch_reminder(
        self,
        *,
        category: str,
        gym_id: str,
        user_id: str,
        day_key: str,
        window_index: int,
        title_override: str | None = None,
        body_override: str | None = None,
    ) -> bool:
        dedupe_key = f"{category}:{day_key}:{window_index}"
        title, body = REMINDER_COPY.get(category, ("Reminder", "It's time for your next habit check-in."))
        if title_override:
            title = title_override
        if body_override:
            body = body_override
        tag = f"gymtra-{category}-{day_key}-{window_index}"
        self.notifications.send_event(
            event_type=category,
            title=title,
            body=body,
            gym_id=gym_id,
            user_id=user_id,
            dedupe_key=dedupe_key,
            tag=tag,
        )
        return True

    def _resolve_template_meals(self, *, gym_id: str, user_id: str) -> list[dict]:
        assignment = self.repo.get_active_diet_assignment(gym_id=gym_id, member_id=user_id)
        if not assignment:
            return []
        template_id = assignment.get("template_id")
        if not isinstance(template_id, ObjectId):
            return []
        template = self.repo.get_diet_template(gym_id=gym_id, template_id=template_id) or {}
        meals = template.get("meal_plan") or []
        return [m for m in meals if isinstance(m, dict)]

    def run_due_reminders(self) -> dict:
        processed = 0
        sent = 0
        for gym in self.repo.list_gyms_with_timezones():
            gym_id = str(gym["_id"])
            tz_name = gym.get("timezone") or "Asia/Kolkata"
            try:
                tz = ZoneInfo(tz_name)
            except Exception:
                tz = ZoneInfo("Asia/Kolkata")
            now_local = datetime.now(tz)
            day_key = now_local.strftime("%Y-%m-%d")
            members = self.repo.list_eligible_members(gym_id=gym["_id"])
            for member in members:
                processed += 1
                prefs = member.get("reminder_preferences") or {}
                task = self.repo.get_daily_task(gym_id=gym_id, member_id=member["user_id"], day_key=day_key)
                if prefs.get("water_enabled", True):
                    water_idx = self._water_reminder_window_index(now_local)
                    if water_idx is not None and not self._should_skip_water(task):
                        if self._dispatch_reminder(
                            category="water",
                            gym_id=gym_id,
                            user_id=member["user_id"],
                            day_key=day_key,
                            window_index=water_idx,
                        ):
                            sent += 1

                if prefs.get("diet_enabled", True):
                    template_meals = self._resolve_template_meals(gym_id=gym_id, user_id=member["user_id"])
                    if template_meals:
                        for idx, meal in enumerate(template_meals):
                            hhmm = str(meal.get("time") or "")
                            in_window, _ = self._is_pre_meal_window(now_local=now_local, meal_hhmm=hhmm)
                            if not in_window:
                                continue
                            meal_name = str(meal.get("name") or "your next meal")
                            if self._dispatch_reminder(
                                category="meal_upcoming",
                                gym_id=gym_id,
                                user_id=member["user_id"],
                                day_key=day_key,
                                window_index=idx,
                                title_override="Upcoming meal in 30 minutes",
                                body_override=f"Upcoming meal: {meal_name}",
                            ):
                                sent += 1
                    else:
                        meal_times = prefs.get("meal_times") or DEFAULT_MEAL_TIMES
                        meal_slots = [
                            ("meal_breakfast", "breakfast", meal_times.get("breakfast", "08:00")),
                            ("meal_lunch", "lunch", meal_times.get("lunch", "13:00")),
                            ("meal_dinner", "dinner", meal_times.get("dinner", "20:00")),
                        ]
                        for idx, (category, slot, hhmm) in enumerate(meal_slots):
                            in_window, _ = self._is_in_window(now_local=now_local, target_hhmm=hhmm)
                            if not in_window or self._should_skip_meal(task, slot):
                                continue
                            if self._dispatch_reminder(
                                category=category,
                                gym_id=gym_id,
                                user_id=member["user_id"],
                                day_key=day_key,
                                window_index=idx,
                            ):
                                sent += 1
        logger.info("member_reminders.run", extra={"processed": processed, "sent": sent})
        return {"processed": processed, "sent": sent}
