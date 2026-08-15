"""
Servicio de envio de correo electronico via SMTP.

La configuracion se lee primero de la tabla `configuracion_general` (lo que se
guarda en la pestana Notificaciones) y, si no esta configurada, cae en las
variables de entorno (SMTP_HOST, SMTP_USER, SMTP_PASSWORD, etc.). Para Gmail
se debe usar una contrasena de aplicacion.
"""

import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.configuracion_general import ConfiguracionGeneral

logger = logging.getLogger(__name__)


@dataclass
class SMTPConfig:
    host: str
    port: int
    user: str
    password: str
    from_addr: str
    use_tls: bool


async def get_smtp_config(db: AsyncSession | None = None) -> SMTPConfig | None:
    """Lee la configuracion SMTP de la BD (si existe) o de variables de entorno."""
    host = settings.SMTP_HOST
    port = settings.SMTP_PORT
    user = settings.SMTP_USER
    password = settings.SMTP_PASSWORD
    from_addr = settings.SMTP_FROM or settings.SMTP_USER

    if db is not None:
        try:
            result = await db.execute(
                select(ConfiguracionGeneral).where(ConfiguracionGeneral.id == 1)
            )
            general = result.scalar_one_or_none()
            if general and general.smtp_host and general.smtp_user and general.smtp_password:
                host = general.smtp_host
                port = general.smtp_port or 587
                user = general.smtp_user
                password = general.smtp_password
                from_addr = general.smtp_from or general.smtp_user
        except Exception as e:  # noqa: BLE001 - no debe romper el envio por falla de lectura
            logger.warning("No se pudo leer la configuracion SMTP de la BD: %s", e)

    if not host or not user or not password:
        return None
    return SMTPConfig(
        host=host,
        port=port,
        user=user,
        password=password,
        from_addr=from_addr,
        use_tls=settings.SMTP_USE_TLS,
    )


async def smtp_configured(db: AsyncSession | None = None) -> bool:
    return await get_smtp_config(db) is not None


async def send_email(
    db: AsyncSession,
    to_email: str,
    subject: str,
    body_plain: str,
    body_html: str | None = None,
) -> bool:
    """Envia un correo. Devuelve True si se envio correctamente."""
    config = await get_smtp_config(db)
    if config is None:
        logger.warning(
            "SMTP no configurado (falta SMTP_USER/SMTP_PASSWORD). No se envio correo a %s",
            to_email,
        )
        return False

    msg = EmailMessage()
    msg["From"] = config.from_addr
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body_plain)
    if body_html:
        msg.add_alternative(body_html, subtype="html")

    try:
        with smtplib.SMTP(config.host, config.port, timeout=15) as server:
            server.ehlo()
            if config.use_tls:
                server.starttls()
                server.ehlo()
            server.login(config.user, config.password)
            server.send_message(msg)
        logger.info("Correo enviado a %s (asunto: %s)", to_email, subject)
        return True
    except Exception as e:  # noqa: BLE001
        logger.error("Error enviando correo a %s: %s", to_email, e)
        return False
