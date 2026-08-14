from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
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


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales invalidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(Usuario).where(Usuario.id_usuario == user_id))
    usuario = result.scalar_one_or_none()
    if usuario is None or not usuario.activo:
        raise credentials_exception
    return usuario


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Usuario).where(Usuario.username == data.username)
    )
    usuario = result.scalar_one_or_none()

    if not usuario or not verify_password(data.password, usuario.password_user):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contrasena incorrectos",
        )

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado",
        )

    token = create_access_token({"sub": str(usuario.id_usuario)})
    return TokenResponse(access_token=token)


@router.post("/verify-password", response_model=VerifyPasswordResponse)
async def verify_password_endpoint(
    data: VerifyPasswordRequest,
    current_user: Usuario = Depends(get_current_user),
):
    """Verifica que la contrasena pertenece al usuario autenticado."""
    if not verify_password(data.password, current_user.password_user):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contrasena incorrecta",
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
    data: RecoverRequest, db: AsyncSession = Depends(get_db)
):
    """Solicita el envio de un codigo de verificacion al correo del usuario."""
    username = data.username.strip()
    resultado = {
        "status": "ok",
        "message": (
            "Si el usuario existe y tiene un correo registrado, "
            "se envio un codigo de verificacion."
        ),
    }

    result = await db.execute(
        select(Usuario).where(func.lower(Usuario.username) == username.lower())
    )
    usuario = result.scalar_one_or_none()

    if not usuario or not usuario.email:
        return resultado

    if not email_service.smtp_configured():
        return {
            "status": "error",
            "email": recovery.mask_email(usuario.email),
            "message": (
                "El envio de correo no esta configurado en el servidor. "
                "Contacta al administrador para configurar SMTP."
            ),
        }

    code = recovery.create_code(usuario.username)
    subject = "COBAO - Codigo de recuperacion de contrasena"
    body = (
        f"Hola {usuario.nombre_completo},\n\n"
        f"Recibimos una solicitud para restablecer la contrasena de tu cuenta "
        f"'{usuario.username}'.\n\n"
        f"Tu codigo de verificacion es: {code}\n\n"
        f"Este codigo es valido por {settings.RECOVERY_CODE_EXPIRE_MINUTES} minutos. "
        f"Si no solicitaste este cambio, ignora este correo.\n\n"
        f"COBAO Plantel 27 Miahuatlan"
    )
    sent = email_service.send_email(usuario.email, subject, body)

    if not sent:
        return {
            "status": "error",
            "email": recovery.mask_email(usuario.email),
            "message": "No se pudo enviar el correo. Verifica la configuracion SMTP e intenta de nuevo.",
        }

    return {
        "status": "ok",
        "email": recovery.mask_email(usuario.email),
        "message": "Se envio un codigo de verificacion a tu correo.",
    }


@router.post("/recover/reset")
async def reset_password(
    data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)
):
    """Valida el codigo y establece la nueva contrasena."""
    username = data.username.strip()
    code = data.code.strip()

    if len(data.new_password) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contrasena debe tener al menos 4 caracteres.",
        )

    if not code.isdigit() or len(code) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El codigo debe ser de 6 digitos.",
        )

    result = await db.execute(
        select(Usuario).where(func.lower(Usuario.username) == username.lower())
    )
    usuario = result.scalar_one_or_none()

    if not usuario or not recovery.consume_code(usuario.username, code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Codigo invalido o expirado.",
        )

    usuario.password_user = hash_password(data.new_password)
    await db.commit()

    return {
        "status": "ok",
        "message": "Contrasena actualizada correctamente. Ya puedes iniciar sesion.",
    }
