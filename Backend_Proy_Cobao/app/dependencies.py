"""
Seguridad global: middleware ASGI de autenticacion + helpers de autorizacion.

AuthMiddleware protege TODA la API (/api/v1) por igual, tanto peticiones HTTP
como WebSockets, salvo rutas explicitamente publicas:

  - /api/v1/                       (raiz informativa)
  - /api/v1/auth/login             (login)
  - /api/v1/auth/recover/*         (recuperacion de contrasena)

Los endpoints del lector NFC (/api/v1/nfc/scan, /api/v1/nfc/capture/*,
/api/v1/nfc/ws) aceptan, ademas del Bearer token del frontend, la llave de API
del lector (header X-API-Key / query ?token=). Si NFC_API_KEY no esta
configurado, los lectores no podran escribir (solo el frontend con su JWT).
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


def is_public_path(path: str) -> bool:
    if path in PUBLIC_PATHS:
        return True
    if path.startswith(f"{API_PREFIX}/auth/recover/"):
        return True
    return False


def is_nfc_path(path: str) -> bool:
    return path.startswith(NFC_PATHS)


def _valid_api_key(api_key: str) -> bool:
    if not settings.nfc_api_key_set or not api_key:
        return False
    return hmac.compare_digest(api_key, settings.NFC_API_KEY)


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _token_from_headers(headers: dict[bytes, bytes]) -> str | None:
    value = headers.get(b"authorization", b"").decode("latin-1", errors="ignore")
    if value.startswith("Bearer "):
        token = value[len("Bearer "):].strip()
        return token or None
    return None


def _token_from_query(query_string: bytes) -> str | None:
    from urllib.parse import unquote, urlparse

    query = urlparse("?" + query_string.decode("latin-1", errors="ignore")).query
    try:
        params = dict(p.split("=", 1) for p in query.split("&") if p)
    except ValueError:
        return None
    raw = params.get("token")
    if not raw:
        return None
    return unquote(raw).strip() or None


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
        api_key = headers.get(b"x-api-key", b"").decode("latin-1", errors="ignore")

        if is_nfc_path(path) and _valid_api_key(api_key):
            return await self.app(scope, receive, send)

        token = _token_from_headers(headers)
        if not token and scope["type"] == "websocket":
            token = _token_from_query(scope.get("query_string", b""))
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


async def get_current_user_from_request(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Extrae y valida el Bearer token del request (para dependencias de ruta)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales invalidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise credentials_exception
    token = auth_header[len("Bearer "):].strip()
    if not token:
        raise credentials_exception

    from app.routers.auth import decode_token

    usuario = await decode_token(token, db)
    if usuario is None:
        raise credentials_exception
    return usuario


def require_roles(*roles: str):
    """Factory de dependencia: exige que el usuario tenga uno de los roles."""
    async def _checker(
        current_user=Depends(get_current_user_from_request),
        db: AsyncSession = Depends(get_db),
    ):
        result = await db.execute(
            select(Rol).where(Rol.id_rol == current_user.id_rol)
        )
        rol = result.scalar_one_or_none()
        rol_nombre = rol.nombre if rol else ""
        if rol_nombre not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para esta accion",
            )
        return current_user

    return _checker
