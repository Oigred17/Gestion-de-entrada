from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import configuracion as crud_config
from app.database import get_db
from app.schemas.configuracion import (
    ConfiguracionGeneralUpdate,
    ConfiguracionResponse,
    HorarioCreate,
    HorarioResponse,
    HorarioUpdate,
)

router = APIRouter(prefix="/configuracion", tags=["Configuracion"])


def _general_dict(general) -> dict:
    if not general:
        return {}
    return {
        "plantel_nombre": general.plantel_nombre,
        "telefono": general.telefono,
        "direccion": general.direccion,
        "correo": general.correo,
        "logo_base64": general.logo_base64,
        "hora_entrada": general.hora_entrada,
        "hora_salida": general.hora_salida,
        "smtp_host": general.smtp_host,
        "smtp_port": general.smtp_port,
        "smtp_user": general.smtp_user,
        "smtp_password": general.smtp_password,
        "smtp_from": general.smtp_from,
        "sms_proveedor": general.sms_proveedor,
        "sms_api_key": general.sms_api_key,
        "sms_remitente": general.sms_remitente,
        "whatsapp_api_key": general.whatsapp_api_key,
        "whatsapp_numero": general.whatsapp_numero,
        "notif_email": bool(general.notif_email),
        "notif_sms": bool(general.notif_sms),
        "notif_whatsapp": bool(general.notif_whatsapp),
    }


def _asistencia_dict(asistencia) -> dict:
    if not asistencia:
        return {}
    return {
        "hora_entrada_limite": str(asistencia.hora_entrada_limite),
        "minutos_tolerancia": asistencia.minutos_tolerancia,
        "segundos_antirebote": asistencia.segundos_antirebote,
    }


@router.get("/", response_model=ConfiguracionResponse)
async def obtener_configuracion(db: AsyncSession = Depends(get_db)):
    general = await crud_config.get_general(db)
    asistencia = await crud_config.get_asistencia(db)
    horarios = await crud_config.get_horarios(db)
    return ConfiguracionResponse(
        plantel=_general_dict(general),
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
    data: ConfiguracionGeneralUpdate, db: AsyncSession = Depends(get_db)
):
    await crud_config.update_general(db, data)
    general = await crud_config.get_general(db)
    asistencia = await crud_config.get_asistencia(db)
    horarios = await crud_config.get_horarios(db)
    return ConfiguracionResponse(
        plantel=_general_dict(general),
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
async def crear_horario(data: HorarioCreate, db: AsyncSession = Depends(get_db)):
    return await crud_config.create_horario(db, data)


@router.put("/horarios/{id_horario}", response_model=HorarioResponse)
async def actualizar_horario(
    id_horario: int, data: HorarioUpdate, db: AsyncSession = Depends(get_db)
):
    horario = await crud_config.update_horario(db, id_horario, data)
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    return horario


@router.delete("/horarios/{id_horario}", status_code=204)
async def eliminar_horario(id_horario: int, db: AsyncSession = Depends(get_db)):
    ok = await crud_config.delete_horario(db, id_horario)
    if not ok:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
