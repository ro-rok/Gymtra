import json

from pymongo.database import Database
from pywebpush import WebPushException, webpush

from app.core.config import get_settings
from app.modules.notifications.repository import NotificationsRepository


class NotificationsService:
    def __init__(self, db: Database):
        self.repo = NotificationsRepository(db)
        self.settings = get_settings()

    def save_subscription(self, *, endpoint: str, keys: dict, user_id: str, gym_id: str | None, user_agent: str | None):
        self.repo.upsert_push_subscription(
            {
                "endpoint": endpoint,
                "keys": keys,
                "user_id": user_id,
                "gym_id": gym_id,
                "user_agent": user_agent,
            }
        )

    def remove_subscription(self, endpoint: str):
        self.repo.deactivate_push_subscription(endpoint)

    def _vapid_claims(self) -> dict:
        return {"sub": self.settings.vapid_subject}

    def _can_send(self, *, gym_id: str, user_id: str, event_type: str) -> bool:
        return not self.repo.has_recent_event(gym_id=gym_id, user_id=user_id, event_type=event_type)

    def _send_to_subscriptions(self, *, subscriptions: list[dict], payload: dict, gym_id: str, user_id: str, event_type: str):
        if not subscriptions:
            self.repo.create_notification_log(
                {
                    "gym_id": gym_id,
                    "user_id": user_id,
                    "event_type": event_type,
                    "status": "skipped",
                    "error": "No active subscriptions",
                }
            )
            return
        for sub in subscriptions:
            endpoint = sub.get("endpoint", "")
            try:
                webpush(
                    subscription_info={
                        "endpoint": endpoint,
                        "keys": sub.get("keys", {}),
                    },
                    data=json.dumps(payload),
                    vapid_private_key=self.settings.vapid_private_key,
                    vapid_claims=self._vapid_claims(),
                )
                self.repo.create_notification_log(
                    {
                        "gym_id": gym_id,
                        "user_id": user_id,
                        "endpoint": endpoint,
                        "event_type": event_type,
                        "status": "sent",
                        "payload": payload,
                    }
                )
            except WebPushException as exc:
                self.repo.create_notification_log(
                    {
                        "gym_id": gym_id,
                        "user_id": user_id,
                        "endpoint": endpoint,
                        "event_type": event_type,
                        "status": "failed",
                        "error": str(exc),
                    }
                )

    def send_event(
        self,
        *,
        event_type: str,
        title: str,
        body: str,
        gym_id: str,
        user_id: str | None = None,
    ) -> None:
        users = [user_id] if user_id else list({row.get("user_id") for row in self.repo.get_active_subscriptions(gym_id=gym_id)})
        for target_user_id in [u for u in users if u]:
            if not self._can_send(gym_id=gym_id, user_id=target_user_id, event_type=event_type):
                continue
            subs = self.repo.get_active_subscriptions(gym_id=gym_id, user_id=target_user_id)
            self._send_to_subscriptions(
                subscriptions=subs,
                payload={"title": title, "body": body, "eventType": event_type},
                gym_id=gym_id,
                user_id=target_user_id,
                event_type=event_type,
            )

    def send_daily_task_reminder_if_needed(self, *, gym_id: str, user_id: str, day_key: str, task_row: dict):
        if task_row.get("workout") and task_row.get("meal") and task_row.get("water"):
            return
        self.send_event(
            event_type="incomplete_daily_tasks",
            title="Finish today's tasks",
            body=f"You still have pending daily tasks for {day_key}.",
            gym_id=gym_id,
            user_id=user_id,
        )

