from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError as JWTError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.schemas.auth import (
    LoginRequest,
    RecoverRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
    VerifyPasswordRequest,
    VerifyPasswordResponse,
)
from app.services import email_service, recovery
from app.services.rate_limit import login_limiter, recovery_limiter

router = APIRouter(prefix="/auth", tags=["Auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def decode_token(token: str, db: AsyncSession) -> Usuario | None:
    """Decodifica un JWT y carga el usuario. Devuelve None si es inválido o el
    usuario no existe / está desactivado."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            return None
        user_id = int(user_id_str)
    except (JWTError, ValueError, TypeError):
        return None

    result = await db.execute(select(Usuario).where(Usuario.id_usuario == user_id))
    usuario = result.scalar_one_or_none()
    if usuario is None or not usuario.activo:
        return None
    return usuario


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    usuario = await decode_token(token, db)
    if usuario is None:
        raise credentials_exception
    return usuario


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = _client_ip(request)
    if not login_limiter.allow(f"login:{ip}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espera unos minutos e intenta de nuevo.",
        )

    result = await db.execute(
        select(Usuario).where(Usuario.username == data.username)
    )
    usuario = result.scalar_one_or_none()

    if not usuario or not verify_password(data.password, usuario.password_user):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado",
        )

    login_limiter.reset(f"login:{ip}")
    token = create_access_token({"sub": str(usuario.id_usuario)})
    return TokenResponse(access_token=token)


@router.post("/verify-password", response_model=VerifyPasswordResponse)
async def verify_password_endpoint(
    data: VerifyPasswordRequest,
    current_user: Usuario = Depends(get_current_user),
):
    """Verifica que la contraseña pertenece al usuario autenticado."""
    if not verify_password(data.password, current_user.password_user):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta",
        )
    return VerifyPasswordResponse(valid=True)


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Rol).where(Rol.id_rol == current_user.id_rol))
    rol = result.scalar_one_or_none()
    rol_nombre = rol.nombre if rol else "Directivo"

    name_parts = current_user.nombre_completo.split() if current_user.nombre_completo else []
    return UserResponse(
        id=current_user.id_usuario,
        username=current_user.username,
        email=current_user.username + "@cobao.edu.mx",
        nombre=name_parts[0] if name_parts else "",
        apellido_paterno=name_parts[1] if len(name_parts) > 1 else "",
        apellido_materno=name_parts[2] if len(name_parts) > 2 else "",
        rol=rol_nombre,
    )


@router.post("/recover/request")
async def request_recovery(
    data: RecoverRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Solicita el envío de un código de verificación al correo del usuario."""
    ip = _client_ip(request)
    if not recovery_limiter.allow(f"recover:{ip}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiadas solicitudes. Espera unos minutos e intenta de nuevo.",
        )

    username = data.username.strip()
    resultado = {
        "status": "ok",
        "message": (
            "Si el usuario existe y tiene un correo registrado, "
            "se envió un código de verificación."
        ),
    }

    result = await db.execute(
        select(Usuario).where(func.lower(Usuario.username) == username.lower())
    )
    usuario = result.scalar_one_or_none()

    if not usuario or not usuario.email:
        return resultado

    if not await email_service.smtp_configured(db):
        return {
            "status": "error",
            "email": recovery.mask_email(usuario.email),
            "message": (
                "El envío de correo no está configurado en el servidor. "
                "Contacta al administrador para configurar SMTP."
            ),
        }

    code = recovery.create_code(usuario.username)
    subject = "COBAO - Código de recuperación de contraseña"
    body = (
        f"Hola {usuario.nombre_completo},\n\n"
        f"Recibimos una solicitud para restablecer la contraseña de tu cuenta "
        f"'{usuario.username}'.\n\n"
        f"Tu código de verificación es: {code}\n\n"
        f"Este código es válido por {settings.RECOVERY_CODE_EXPIRE_MINUTES} minutos. "
        f"Si no solicitaste este cambio, ignora este correo.\n\n"
        f"COBAO Plantel 27 Miahuatlan"
    )
    sent = await email_service.send_email(db, usuario.email, subject, body)

    if not sent:
        return {
            "status": "error",
            "email": recovery.mask_email(usuario.email),
            "message": "No se pudo enviar el correo. Verifica la configuración SMTP e intenta de nuevo.",
        }

    return {
        "status": "ok",
        "email": recovery.mask_email(usuario.email),
        "message": "Se envió un código de verificación a tu correo.",
    }


@router.post("/recover/reset")
async def reset_password(
    data: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Valida el código y establece la nueva contraseña."""
    ip = _client_ip(request)
    if not recovery_limiter.allow(f"reset:{ip}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espera unos minutos e intenta de nuevo.",
        )

    username = data.username.strip()
    code = data.code.strip()

    if len(data.new_password) < settings.MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "La contraseña debe tener al menos "
                f"{settings.MIN_PASSWORD_LENGTH} caracteres."
            ),
        )

    if not code.isdigit() or len(code) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código debe ser de 6 dígitos.",
        )

    result = await db.execute(
        select(Usuario).where(func.lower(Usuario.username) == username.lower())
    )
    usuario = result.scalar_one_or_none()

    if not usuario or not recovery.consume_code(usuario.username, code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código inválido o expirado.",
        )

    usuario.password_user = hash_password(data.new_password)
    await db.commit()

    return {
        "status": "ok",
        "message": "Contraseña actualizada correctamente. Ya puedes iniciar sesión.",
    }
