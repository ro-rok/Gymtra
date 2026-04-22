import logging
from typing import Any


def capture_exception_for_monitoring(*, exc: Exception, context: dict[str, Any] | None = None) -> None:
    # Placeholder integration point for Sentry or similar tools.
    _ = (exc, context)


def log_structured_error(
    logger: logging.Logger,
    *,
    event: str,
    error: Exception | str,
    context: dict[str, Any] | None = None,
) -> None:
    message = str(error)
    error_type = error.__class__.__name__ if isinstance(error, Exception) else "Error"
    extra = {"event": event, "error_type": error_type, "error": message, **(context or {})}
    logger.error(event, extra=extra)
    if isinstance(error, Exception):
        capture_exception_for_monitoring(exc=error, context=extra)
