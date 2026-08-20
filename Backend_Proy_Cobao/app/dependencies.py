"""
Seguridad global: middleware ASGI de autenticación + helpers de autorización.

AuthMiddleware protege TODA la API (/api/v1) por igual, tanto peticiones HTTP
como WebSockets, salvo rutas explicitamente publicas:

  - /api/v1/                       (raiz informativa)
  - /api/v1/auth/login             (login)
  - /api/v1/auth/recover/*         (recuperación de contraseña)

El token se extrae en este orden de prioridad:
  1. Header Authorization: Bearer <token>  (para NFC reader y API clients)
  2. Cookie access_token_cookie           (para el navegador web)

Estación NFC (lector físico en otra PC):
  - Solo los paths /api/v1/nfc/* aceptan la llave de estación (X-API-Key),
    además del Bearer JWT del personal.
  - Esa llave NO es un usuario ni una contraseña: es un secreto de dispositivo
    generado en el servidor (.env NFC_API_KEY) y copiado a nfc_key.txt del lector.
  - Registrar entradas/salidas: llave de estación O sesión con rol Entrada/Prefectura.
  - Servicios Escolares usa JWT + modo captura (nunca registra con la llave
    salvo que el lector físico esté en captura iniciada desde la web).
"""

import hmac
import logging

from fastapi import Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session, get_db
from app.models.rol import Rol

logger = logging.getLogger(__name__)

API_PREFIX = "/api/v1"

PUBLIC_PATHS = {
    f"{API_PREFIX}/",
    f"{API_PREFIX}/auth/login",
}

NFC_PATHS = f"{API_PREFIX}/nfc/"

COOKIE_NAME = "access_token_cookie"


def is_public_path(path: str) -> bool:
    if path in PUBLIC_PATHS:
        return True
    if path.startswith(f"{API_PREFIX}/auth/recover/"):
        return True
    return False


def is_nfc_path(path: str) -> bool:
    return path.startswith(NFC_PATHS)


def _valid_station_key(api_key: str) -> bool:
    """Valida la llave de estación NFC (dispositivo), no una cuenta de usuario."""
    if not settings.nfc_api_key_set or not api_key:
        return False
    return hmac.compare_digest(api_key, settings.NFC_API_KEY)


def _token_from_headers(headers: dict[bytes, bytes]) -> str | None:
    value = headers.get(b"authorization", b"").decode("latin-1", errors="ignore")
    if value.startswith("Bearer "):
        token = value[len("Bearer "):].strip()
        return token or None
    return None


def _token_from_cookies(headers: dict[bytes, bytes]) -> str | None:
    cookie_header = headers.get(b"cookie", b"").decode("latin-1", errors="ignore")
    if not cookie_header:
        return None
    for part in cookie_header.split(";"):
        part = part.strip()
        if part.startswith(f"{COOKIE_NAME}="):
            return part[len(COOKIE_NAME) + 1:].strip() or None
    return None


def _api_key_from_headers(headers: dict[bytes, bytes]) -> str:
    return headers.get(b"x-api-key", b"").decode("latin-1", errors="ignore")


class AuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] not in ("http", "websocket"):
            return await self.app(scope, receive, send)

        path = scope.get("path", "")
        if not path.startswith(API_PREFIX) or is_public_path(path):
            return await self.app(scope, receive, send)

        if scope["type"] == "http" and scope.get("method") == "OPTIONS":
            return await self.app(scope, receive, send)

        headers = {k.lower(): v for k, v in (scope.get("headers") or [])}

        # Solo rutas NFC: la llave de estación autoriza al lector físico.
        if is_nfc_path(path) and _valid_station_key(_api_key_from_headers(headers)):
            return await self.app(scope, receive, send)

        # 1. Intentar token desde header Authorization (NFC reader, API clients)
        token = _token_from_headers(headers)

        # 2. Si no hay header, intentar desde cookie (navegador web)
        if not token:
            token = _token_from_cookies(headers)

        if not token:
            return await self._deny(scope, send)

        from app.routers.auth import decode_token

        async with async_session() as db:
            usuario = await decode_token(token, db)
        if usuario is None:
            return await self._deny(scope, send)

        return await self.app(scope, receive, send)

    async def _deny(self, scope, send):
        if scope["type"] == "websocket":
            return await send(
                {
                    "type": "websocket.close",
                    "code": 4401,
                    "reason": "No autorizado",
                }
            )
        response = JSONResponse({"detail": "No autorizado"}, status_code=401)
        return await response(scope, None, send)


async def _usuario_desde_request(request: Request, db: AsyncSession):
    """Extrae y valida el token del request (header o cookie)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Intentar header Authorization
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[len("Bearer "):].strip()

    # 2. Intentar cookie
    if not token:
        token = request.cookies.get(COOKIE_NAME)

    if not token:
        raise credentials_exception

    from app.routers.auth import decode_token

    usuario = await decode_token(token, db)
    if usuario is None:
        raise credentials_exception
    return usuario


async def get_current_user_from_request(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await _usuario_desde_request(request, db)


async def _rol_nombre(db: AsyncSession, id_rol: int) -> str:
    result = await db.execute(select(Rol).where(Rol.id_rol == id_rol))
    rol = result.scalar_one_or_none()
    return rol.nombre if rol else ""


ROLES_REGISTRAR_ACCESO = ("Entrada", "Prefectura")


async def require_registrar_acceso(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Autoriza registrar entradas/salidas.

    - Lector físico: llave de estación (X-API-Key = NFC_API_KEY del servidor).
    - Personal web: sesión JWT con rol Entrada o Prefectura.
    """
    api_key = request.headers.get("X-API-Key", "")
    if _valid_station_key(api_key):
        return None

    usuario = await _usuario_desde_request(request, db)
    if await _rol_nombre(db, usuario.id_rol) not in ROLES_REGISTRAR_ACCESO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar entradas o salidas",
        )
    return usuario


def require_roles(*roles: str):
    """Factory de dependencia: exige que el usuario tenga uno de los roles."""
    async def _checker(
        current_user=Depends(get_current_user_from_request),
        db: AsyncSession = Depends(get_db),
    ):
        rol_nombre = await _rol_nombre(db, current_user.id_rol)
        if rol_nombre not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para esta acción",
            )
        return current_user

    return _checker
