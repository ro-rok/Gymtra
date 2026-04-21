from datetime import datetime, timezone
from typing import Any

from pymongo.database import Database


def log_audit_event(
    db: Database,
    *,
    action: str,
    actor_user_id: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    db.audit_logs.insert_one(
        {
            "action": action,
            "actor_user_id": actor_user_id,
            "target_type": target_type,
            "target_id": target_id,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc),
        }
    )

