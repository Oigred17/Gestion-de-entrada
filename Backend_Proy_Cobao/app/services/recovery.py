"""
Servicio de códigos de recuperación de contraseña.

Los códigos se guardan en memoria con fecha de expiración. El proceso de
uvicorn usa un solo worker, por lo que es suficiente para esta aplicación.
"""

import secrets
import time
from dataclasses import dataclass

from app.config import settings


@dataclass
class ResetEntry:
    code: str
    expires_at: float


_codes: dict[str, ResetEntry] = {}


def generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def create_code(username: str) -> str:
    """Genera y guarda un código para el usuario. Devuelve el código."""
    code = generate_code()
    _codes[username.lower()] = ResetEntry(
        code=code,
        expires_at=time.time() + settings.RECOVERY_CODE_EXPIRE_MINUTES * 60,
    )
    return code


def verify_code(username: str, code: str) -> bool:
    entry = _codes.get(username.lower())
    if not entry:
        return False
    if time.time() > entry.expires_at:
        _codes.pop(username.lower(), None)
        return False
    return secrets.compare_digest(entry.code, code)


def consume_code(username: str, code: str) -> bool:
    """Valida el código y, si es correcto, lo elimina (un solo uso)."""
    if not verify_code(username, code):
        return False
    _codes.pop(username.lower(), None)
    return True


def mask_email(email: str) -> str:
    """Enmascara el correo para mostrarlo de forma segura (ej: j***@gmail.com)."""
    if "@" not in email:
        return email
    local, _, domain = email.partition("@")
    if not local:
        return email
    visible = local[0] if len(local) >= 1 else ""
    return f"{visible}***@{domain}"
