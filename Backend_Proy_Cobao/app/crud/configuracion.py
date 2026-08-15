from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.configuracion_asistencia import ConfiguracionAsistencia
from app.models.configuracion_general import ConfiguracionGeneral
from app.models.horario import Horario
from app.schemas.configuracion import (
    ConfiguracionGeneralUpdate,
    HorarioCreate,
    HorarioUpdate,
)


async def get_general(db: AsyncSession) -> ConfiguracionGeneral | None:
    result = await db.execute(select(ConfiguracionGeneral).where(ConfiguracionGeneral.id == 1))
    return result.scalar_one_or_none()


async def get_asistencia(db: AsyncSession) -> ConfiguracionAsistencia | None:
    result = await db.execute(select(ConfiguracionAsistencia).where(ConfiguracionAsistencia.id == 1))
    return result.scalar_one_or_none()


async def get_horarios(db: AsyncSession) -> list[Horario]:
    result = await db.execute(select(Horario).order_by(Horario.id.asc()))
    return result.scalars().all()


async def get_horario(db: AsyncSession, id_horario: int) -> Horario | None:
    result = await db.execute(select(Horario).where(Horario.id == id_horario))
    return result.scalar_one_or_none()


async def update_general(db: AsyncSession, data: ConfiguracionGeneralUpdate) -> dict:
    general = await get_general(db)
    if not general:
        general = ConfiguracionGeneral(id=1)
        db.add(general)
    asistencia = await get_asistencia(db)
    if not asistencia:
        asistencia = ConfiguracionAsistencia(id=1)
        db.add(asistencia)

    general_fields = {
        "plantel_nombre", "telefono", "direccion", "correo", "logo_base64",
        "hora_entrada", "hora_salida", "dias_habiles", "smtp_host", "smtp_port",
        "smtp_user", "smtp_password", "smtp_from", "sms_proveedor", "sms_api_key",
        "sms_remitente", "whatsapp_api_key", "whatsapp_numero",
        "notif_email", "notif_sms", "notif_whatsapp",
    }
    asistencia_fields = {
        "hora_entrada_limite", "minutos_tolerancia", "segundos_antirebote",
    }

    # Campos de secreto: si llegan vacios o con el placeholder no se tocan,
    # asi el frontend puede guardar el formulario sin reescribir los secretos.
    secret_fields = {"smtp_password", "sms_api_key", "whatsapp_api_key"}

    for key, value in data.model_dump(exclude_unset=True).items():
        if key in secret_fields and value in ("", "********"):
            continue
        if key in general_fields and hasattr(general, key):
            setattr(general, key, value)
        elif key in asistencia_fields and hasattr(asistencia, key):
            setattr(asistencia, key, value)

    general.updated_at = func.now()
    await db.flush()
    await db.refresh(general)
    await db.refresh(asistencia)
    return {"general": general, "asistencia": asistencia}


async def create_horario(db: AsyncSession, data: HorarioCreate) -> Horario:
    horario = Horario(
        descripcion=data.descripcion,
        hora_entrada=data.hora_entrada,
        hora_salida=data.hora_salida,
        dias=data.dias or "",
        activo=data.activo,
    )
    db.add(horario)
    await db.flush()
    await db.refresh(horario)
    return horario


async def update_horario(db: AsyncSession, id_horario: int, data: HorarioUpdate) -> Horario | None:
    horario = await get_horario(db, id_horario)
    if not horario:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        if hasattr(horario, key):
            setattr(horario, key, value)
    await db.flush()
    await db.refresh(horario)
    return horario


async def delete_horario(db: AsyncSession, id_horario: int) -> bool:
    horario = await get_horario(db, id_horario)
    if not horario:
        return False
    await db.delete(horario)
    return True
