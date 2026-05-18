WATER_LOG_ROUTE = "/member#water-log"

NOTIFICATION_ROUTE_MAP: dict[str, str] = {
    "water": WATER_LOG_ROUTE,
    "meal_breakfast": "/member",
    "meal_lunch": "/member",
    "meal_dinner": "/member",
    "incomplete_daily_tasks": "/member",
    "password_reset_request": "/owner",
    "platform_test": "/",
}


def notification_url_for(event_type: str, gym_slug: str | None = None) -> str:
    base = event_type.split(":")[0] if ":" in event_type else event_type
    path = NOTIFICATION_ROUTE_MAP.get(base, "/")
    if not gym_slug or path == "/":
        return path
    prefix = f"/{gym_slug}"
    if path.startswith(prefix):
        return path
    return f"{prefix}{path}"
