"""
Servicio de envio de correo electronico via SMTP.

La configuracion se lee de variables de entorno (SMTP_HOST, SMTP_USER,
SMTP_PASSWORD, etc.). Para Gmail se debe usar una contrasena de aplicacion.
"""

import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger(__name__)


def smtp_configured() -> bool:
    return settings.smtp_configured


def send_email(
    to_email: str,
    subject: str,
    body_plain: str,
    body_html: str | None = None,
) -> bool:
    """Envia un correo. Devuelve True si se envio correctamente."""
    if not smtp_configured():
        logger.warning(
            "SMTP no configurado (falta SMTP_USER/SMTP_PASSWORD). "
            "No se envio correo a %s",
            to_email,
        )
        return False

    from_addr = settings.SMTP_FROM or settings.SMTP_USER

    msg = EmailMessage()
    msg["From"] = from_addr
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body_plain)
    if body_html:
        msg.add_alternative(body_html, subtype="html")

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            if settings.SMTP_USE_TLS:
                server.starttls()
                server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Correo enviado a %s (asunto: %s)", to_email, subject)
        return True
    except Exception as e:
        logger.error("Error enviando correo a %s: %s", to_email, e)
        return False
