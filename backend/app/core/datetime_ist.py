"""IST date/time helpers for server-side scheduling."""

from datetime import datetime
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")
WEEKDAY_SHORT_TO_INDEX = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}


def get_ist_weekday(value: datetime | None = None) -> int:
    """Monday=0 through Sunday=6."""
    dt = value or datetime.now(IST)
    short = dt.strftime("%a")
    return WEEKDAY_SHORT_TO_INDEX.get(short, 0)
