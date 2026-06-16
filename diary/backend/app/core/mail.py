from pathlib import Path
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings

import logging

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "template"

env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)

def render_template(template_name: str, context: dict) -> str:
    template = env.get_template(template_name)
    return template.render(**context)

def send_email_html(to_email: str, subject: str, html_body: str) -> None:
    if not settings.SMTP_HOST or not settings.SMTP_USERNAME:
        logger.warning(
            "SMTP not configured — skipping email to %s (subject: %s)", to_email, subject
        )
        return

    # Mail.ru требует, чтобы From: точно совпадал с SMTP-логином.
    from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = from_email
    message["To"] = to_email

    message.attach(MIMEText(html_body, "html"))

    # Порт 465 — неявный SSL (Mail.ru, Yandex), остальные — STARTTLS (587).
    if settings.SMTP_PORT == 465:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(from_email, to_email, message.as_string())
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(from_email, to_email, message.as_string())

    logger.info("Password reset email sent to %s", to_email)
