"""Phone helpers for WhatsApp wa.me links."""

from __future__ import annotations

INDIA_COUNTRY_CODE = "91"


def normalize_whatsapp_digits(phone: str) -> str:
    """Return digits only for wa.me, defaulting Indian numbers to country code 91."""
    digits = "".join(c for c in phone if c.isdigit())
    if not digits:
        return ""
    if digits.startswith(INDIA_COUNTRY_CODE) and len(digits) >= 12:
        return digits
    if digits.startswith("0") and len(digits) == 11:
        return f"{INDIA_COUNTRY_CODE}{digits[1:]}"
    if len(digits) == 10:
        return f"{INDIA_COUNTRY_CODE}{digits}"
    return digits
