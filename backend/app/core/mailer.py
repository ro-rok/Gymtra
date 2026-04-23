import smtplib
from concurrent.futures import ThreadPoolExecutor
from email.message import EmailMessage

from app.core.config import get_settings

_MAIL_EXECUTOR = ThreadPoolExecutor(max_workers=2, thread_name_prefix="mailer")


def _send_email_sync(*, to_email: str, subject: str, body: str) -> None:
    settings = get_settings()
    if not settings.smtp_host or not settings.smtp_from_email:
        return
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from_email
    message["To"] = to_email
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username and settings.smtp_password:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)


def send_email_async(*, to_email: str | None, subject: str, body: str) -> None:
    if not to_email:
        return
    _MAIL_EXECUTOR.submit(_send_email_sync, to_email=to_email, subject=subject, body=body)
