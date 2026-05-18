WATER_LOG_ROUTE = "/member/dashboard#water-log"

NOTIFICATION_ROUTE_MAP: dict[str, str] = {
    "water": WATER_LOG_ROUTE,
    "meal_breakfast": "/member/dashboard",
    "meal_lunch": "/member/dashboard",
    "meal_dinner": "/member/dashboard",
    "incomplete_daily_tasks": "/member/dashboard",
    "password_reset_request": "/owner/dashboard",
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
