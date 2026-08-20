from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import configuracion as crud_config
from app.database import get_db
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.routers.auth import get_current_user
from app.schemas.configuracion import (
    ConfiguracionGeneralUpdate,
    ConfiguracionResponse,
    HorarioCreate,
    HorarioResponse,
    HorarioUpdate,
)

router = APIRouter(prefix="/configuracion", tags=["Configuracion"])

SECRET_PLACEHOLDER = "********"

SECRET_FIELDS = {"smtp_password", "sms_api_key", "whatsapp_api_key"}

# Fields that are masked for non-Directivo users
SMTP_SENSITIVE_FIELDS = {"smtp_host", "smtp_user", "smtp_from"}


def _secret(value: str | None) -> str:
    """Nunca se devuelve un secreto real en la respuesta."""
    if value in (None, "", SECRET_PLACEHOLDER):
        return ""
    return SECRET_PLACEHOLDER


def _mask(value: str | None) -> str:
    """Enmascara un valor de configuración (ej. host SMTP) para roles no-admin."""
    if value in (None, ""):
        return ""
    return SECRET_PLACEHOLDER


def _is_directivo(usuario: Usuario | None) -> bool:
    """Un usuario es Directivo si su id_rol es 1 (por defecto)."""
    if not usuario:
        return False
    return usuario.id_rol == 1


def _general_dict(general, *, full: bool = True) -> dict:
    if not general:
        return {}
    d = {
        "plantel_nombre": general.plantel_nombre,
        "telefono": general.telefono,
        "direccion": general.direccion,
        "correo": general.correo,
        "logo_base64": general.logo_base64,
        "hora_entrada": general.hora_entrada,
        "hora_salida": general.hora_salida,
        "dias_habiles": general.dias_habiles or "",
        "smtp_host": general.smtp_host,
        "smtp_port": general.smtp_port,
        "smtp_user": general.smtp_user,
        "smtp_password": _secret(general.smtp_password),
        "smtp_from": general.smtp_from,
        "sms_proveedor": general.sms_proveedor,
        "sms_api_key": _secret(general.sms_api_key),
        "sms_remitente": general.sms_remitente,
        "whatsapp_api_key": _secret(general.whatsapp_api_key),
        "whatsapp_numero": general.whatsapp_numero,
        "notif_email": bool(general.notif_email),
        "notif_sms": bool(general.notif_sms),
        "notif_whatsapp": bool(general.notif_whatsapp),
    }
    if not full:
        for field in SMTP_SENSITIVE_FIELDS:
            d[field] = _mask(d[field])
    return d


def _asistencia_dict(asistencia) -> dict:
    if not asistencia:
        return {}
    return {
        "hora_entrada_limite": str(asistencia.hora_entrada_limite),
        "minutos_tolerancia": asistencia.minutos_tolerancia,
        "segundos_antirebote": asistencia.segundos_antirebote,
    }


@router.get("/", response_model=ConfiguracionResponse)
async def obtener_configuracion(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    is_directivo = _is_directivo(current_user)
    general = await crud_config.get_general(db)
    asistencia = await crud_config.get_asistencia(db)
    horarios = await crud_config.get_horarios(db)
    return ConfiguracionResponse(
        plantel=_general_dict(general, full=is_directivo),
        horarios=[
            {
                "id": h.id,
                "descripcion": h.descripcion,
                "hora_entrada": h.hora_entrada,
                "hora_salida": h.hora_salida,
                "dias": h.dias or "",
                "activo": bool(h.activo),
            }
            for h in horarios
        ],
        asistencia=_asistencia_dict(asistencia),
    )


@router.put("/", response_model=ConfiguracionResponse)
async def actualizar_configuracion(
    data: ConfiguracionGeneralUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_directivo(current_user):
        raise HTTPException(status_code=403, detail="Solo los Directivos pueden modificar la configuración.")
    await crud_config.update_general(db, data)
    general = await crud_config.get_general(db)
    asistencia = await crud_config.get_asistencia(db)
    horarios = await crud_config.get_horarios(db)
    return ConfiguracionResponse(
        plantel=_general_dict(general, full=True),
        horarios=[
            {
                "id": h.id,
                "descripcion": h.descripcion,
                "hora_entrada": h.hora_entrada,
                "hora_salida": h.hora_salida,
                "dias": h.dias or "",
                "activo": bool(h.activo),
            }
            for h in horarios
        ],
        asistencia=_asistencia_dict(asistencia),
    )


@router.post("/horarios", response_model=HorarioResponse, status_code=201)
async def crear_horario(
    data: HorarioCreate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_directivo(current_user):
        raise HTTPException(status_code=403, detail="Solo los Directivos pueden modificar horarios.")
    return await crud_config.create_horario(db, data)


@router.put("/horarios/{id_horario}", response_model=HorarioResponse)
async def actualizar_horario(
    id_horario: int,
    data: HorarioUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_directivo(current_user):
        raise HTTPException(status_code=403, detail="Solo los Directivos pueden modificar horarios.")
    horario = await crud_config.update_horario(db, id_horario, data)
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    return horario


@router.delete("/horarios/{id_horario}", status_code=204)
async def eliminar_horario(
    id_horario: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not _is_directivo(current_user):
        raise HTTPException(status_code=403, detail="Solo los Directivos pueden modificar horarios.")
    ok = await crud_config.delete_horario(db, id_horario)
    if not ok:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
