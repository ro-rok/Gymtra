import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from bson import ObjectId
from pymongo.database import Database
from pywebpush import WebPushException, webpush

from app.core.config import get_settings
from app.core.observability import log_structured_error
from app.modules.notifications.repository import NotificationsRepository
from app.modules.notifications.routes_map import notification_url_for

_NOTIFICATION_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="notify")


class NotificationsService:
    MAX_SUBSCRIPTION_FANOUT_WORKERS = 8

    def __init__(self, db: Database):
        self.repo = NotificationsRepository(db)
        self.settings = get_settings()
        self.logger = logging.getLogger(__name__)

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

    def remove_subscription(self, *, endpoint: str, user_id: str, gym_id: str | None):
        self.repo.deactivate_push_subscription(endpoint, user_id=user_id, gym_id=gym_id)

    def remove_all_subscriptions_for_user(self, *, user_id: str, gym_id: str | None):
        self.repo.deactivate_all_push_subscriptions_for_user(user_id=user_id, gym_id=gym_id)

    def _vapid_claims(self) -> dict:
        return {"sub": self.settings.vapid_subject}

    def _can_send(self, *, gym_id: str, user_id: str, event_type: str, dedupe_key: str | None = None) -> bool:
        if dedupe_key and self.repo.has_sent_dedupe_key(gym_id=gym_id, user_id=user_id, dedupe_key=dedupe_key):
            return False
        if dedupe_key:
            return True
        return not self.repo.has_recent_event(gym_id=gym_id, user_id=user_id, event_type=event_type)

    def _gym_slug(self, gym_id: str) -> str | None:
        if not gym_id:
            return None
        gym = None
        if ObjectId.is_valid(gym_id):
            gym = self.repo.db.gyms.find_one({"_id": ObjectId(gym_id)}, {"slug": 1})
        if not gym:
            gym = self.repo.db.gyms.find_one({"slug": gym_id}, {"slug": 1})
        if not gym:
            return None
        slug = gym.get("slug")
        return slug if isinstance(slug, str) and slug else None

    @staticmethod
    def _build_payload(
        *,
        title: str,
        body: str,
        event_type: str,
        tag: str | None = None,
        gym_slug: str | None = None,
    ) -> dict:
        base_event = event_type.split(":")[0] if ":" in event_type else event_type
        return {
            "title": title,
            "body": body,
            "eventType": base_event,
            "url": notification_url_for(event_type, gym_slug),
            "tag": tag or f"gymtra-{base_event}",
        }

    @staticmethod
    def _is_permanent_push_failure(exc: WebPushException) -> bool:
        response = getattr(exc, "response", None)
        status_code = getattr(response, "status_code", None)
        return status_code in {404, 410}

    def _send_single_subscription(
        self,
        *,
        subscription: dict,
        payload: dict,
        gym_id: str,
        user_id: str,
        event_type: str,
        metadata: dict | None = None,
    ) -> None:
        endpoint = subscription.get("endpoint", "")
        try:
            webpush(
                subscription_info={
                    "endpoint": endpoint,
                    "keys": subscription.get("keys", {}),
                },
                data=json.dumps(payload),
                vapid_private_key=self.settings.vapid_private_key,
                vapid_claims=self._vapid_claims(),
                ttl=86400,
                headers={"Urgency": "high"},
            )
            log_entry = {
                "gym_id": gym_id,
                "user_id": user_id,
                "endpoint": endpoint,
                "event_type": event_type,
                "status": "sent",
                "payload": payload,
            }
            if metadata:
                log_entry["metadata"] = metadata
            self.repo.create_notification_log(log_entry)
            self.logger.info(
                "notifications.send.success",
                extra={"event": "notifications.send.success", "gym_id": gym_id, "user_id": user_id, "event_type": event_type},
            )
        except WebPushException as exc:
            if endpoint and self._is_permanent_push_failure(exc):
                self.repo.deactivate_push_subscription_by_endpoint(endpoint, reason="permanent_push_failure")
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
            log_structured_error(
                self.logger,
                event="notifications.send.failed",
                error=exc,
                context={
                    "gym_id": gym_id,
                    "user_id": user_id,
                    "event_type": event_type,
                    "endpoint": endpoint,
                },
            )
        except Exception as exc:
            log_structured_error(
                self.logger,
                event="notifications.send.unhandled_exception",
                error=exc,
                context={
                    "gym_id": gym_id,
                    "user_id": user_id,
                    "event_type": event_type,
                    "endpoint": endpoint,
                },
            )

    def send_event(
        self,
        *,
        event_type: str,
        title: str,
        body: str,
        gym_id: str,
        user_id: str | None = None,
        dedupe_key: str | None = None,
        tag: str | None = None,
        metadata: dict | None = None,
    ) -> None:
        users = [user_id] if user_id else list({row.get("user_id") for row in self.repo.get_active_subscriptions(gym_id=gym_id)})
        log_event_type = dedupe_key or event_type
        gym_slug = self._gym_slug(gym_id)
        payload = self._build_payload(
            title=title,
            body=body,
            event_type=event_type,
            tag=tag,
            gym_slug=gym_slug,
        )
        for target_user_id in [u for u in users if u]:
            if not self._can_send(
                gym_id=gym_id,
                user_id=target_user_id,
                event_type=event_type,
                dedupe_key=dedupe_key,
            ):
                continue
            subs = self.repo.get_active_subscriptions(gym_id=gym_id, user_id=target_user_id)
            self._send_to_subscriptions(
                subscriptions=subs,
                payload=payload,
                gym_id=gym_id,
                user_id=target_user_id,
                event_type=log_event_type,
                metadata=metadata,
            )

    def _send_to_subscriptions(
        self,
        *,
        subscriptions: list[dict],
        payload: dict,
        gym_id: str,
        user_id: str,
        event_type: str,
        metadata: dict | None = None,
    ):
        if not subscriptions:
            log_entry = {
                "gym_id": gym_id,
                "user_id": user_id,
                "event_type": event_type,
                "status": "skipped",
                "error": "No active subscriptions",
            }
            if metadata:
                log_entry["metadata"] = metadata
            self.repo.create_notification_log(log_entry)
            self.logger.info(
                "notifications.send.skipped",
                extra={"event": "notifications.send.skipped", "gym_id": gym_id, "user_id": user_id, "event_type": event_type},
            )
            return
        worker_count = max(1, min(len(subscriptions), self.MAX_SUBSCRIPTION_FANOUT_WORKERS))
        with ThreadPoolExecutor(max_workers=worker_count, thread_name_prefix="notify-sub") as fanout_executor:
            futures = [
                fanout_executor.submit(
                    self._send_single_subscription,
                    subscription=sub,
                    payload=payload,
                    gym_id=gym_id,
                    user_id=user_id,
                    event_type=event_type,
                    metadata=metadata,
                )
                for sub in subscriptions
            ]
            for future in as_completed(futures):
                future.result()

    def send_event_async(
        self,
        *,
        event_type: str,
        title: str,
        body: str,
        gym_id: str,
        user_id: str | None = None,
        dedupe_key: str | None = None,
        tag: str | None = None,
        metadata: dict | None = None,
    ) -> None:
        self.logger.info(
            "notifications.send.queued",
            extra={
                "event": "notifications.send.queued",
                "gym_id": gym_id,
                "user_id": user_id,
                "event_type": event_type,
            },
        )
        _NOTIFICATION_EXECUTOR.submit(
            self.send_event,
            event_type=event_type,
            title=title,
            body=body,
            gym_id=gym_id,
            user_id=user_id,
            dedupe_key=dedupe_key,
            tag=tag,
            metadata=metadata,
        )

    def send_daily_task_reminder_if_needed(self, *, gym_id: str, user_id: str, day_key: str, task_row: dict):
        if task_row.get("workout") and task_row.get("meal") and task_row.get("water"):
            return
        self.send_event_async(
            event_type="incomplete_daily_tasks",
            title="Finish today's tasks",
            body=f"You still have pending daily tasks for {day_key}.",
            gym_id=gym_id,
            user_id=user_id,
        )

