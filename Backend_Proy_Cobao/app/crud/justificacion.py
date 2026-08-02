from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.justificacion import Justificacion
from app.schemas.justificacion import JustificacionCreate, JustificacionUpdate


async def get_justificaciones(
    db: AsyncSession,
    alumno_id: int | None = None,
    grupo_id: int | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
):
    stmt = select(Justificacion)
    if alumno_id is not None:
        stmt = stmt.where(Justificacion.id_alumno == alumno_id)
    if grupo_id is not None:
        stmt = stmt.where(Justificacion.id_grupo == grupo_id)
    if fecha_inicio is not None:
        stmt = stmt.where(Justificacion.fecha_inicio >= fecha_inicio)
    if fecha_fin is not None:
        stmt = stmt.where(Justificacion.fecha_fin <= fecha_fin)
    stmt = stmt.order_by(Justificacion.fecha_inicio.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_justificacion(db: AsyncSession, id_justificacion: int):
    result = await db.execute(
        select(Justificacion).where(Justificacion.id_justificacion == id_justificacion)
    )
    return result.scalar_one_or_none()


async def create_justificacion(db: AsyncSession, data: JustificacionCreate):
    justificacion = Justificacion(
        id_alumno=data.id_alumno,
        id_grupo=data.id_grupo,
        fecha_inicio=data.fecha_inicio,
        fecha_fin=data.fecha_fin,
        motivo=data.motivo,
        id_usuario_registro=data.id_usuario_registro,
    )
    db.add(justificacion)
    await db.flush()
    await db.refresh(justificacion)
    return justificacion


async def update_justificacion(db: AsyncSession, id_justificacion: int, data: JustificacionUpdate):
    justificacion = await get_justificacion(db, id_justificacion)
    if not justificacion:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        if hasattr(justificacion, key):
            setattr(justificacion, key, value)
    await db.flush()
    await db.refresh(justificacion)
    return justificacion


async def delete_justificacion(db: AsyncSession, id_justificacion: int):
    justificacion = await get_justificacion(db, id_justificacion)
    if not justificacion:
        return False
    await db.delete(justificacion)
    return True
