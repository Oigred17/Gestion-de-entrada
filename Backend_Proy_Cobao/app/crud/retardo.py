from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.retardo import Retardo
from app.schemas.retardo import RetardoCreate, RetardoUpdate


async def get_retardos(
    db: AsyncSession,
    alumno_id: int | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
):
    stmt = select(Retardo)
    if alumno_id is not None:
        stmt = stmt.where(Retardo.id_alumno == alumno_id)
    if fecha_inicio is not None:
        stmt = stmt.where(Retardo.fecha >= fecha_inicio)
    if fecha_fin is not None:
        stmt = stmt.where(Retardo.fecha <= fecha_fin)
    stmt = stmt.order_by(Retardo.fecha.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_retardo(db: AsyncSession, id_retardo: int):
    result = await db.execute(
        select(Retardo).where(Retardo.id_retardo == id_retardo)
    )
    return result.scalar_one_or_none()


async def create_retardo(db: AsyncSession, data: RetardoCreate):
    retardo = Retardo(
        id_alumno=data.resolved_id_alumno,
        fecha=data.fecha,
        minutos_retardo=data.resolved_minutos_retardo,
        observaciones=data.observaciones,
    )
    db.add(retardo)
    await db.flush()
    await db.refresh(retardo)
    return retardo


async def update_retardo(db: AsyncSession, id_retardo: int, data: RetardoUpdate):
    retardo = await get_retardo(db, id_retardo)
    if not retardo:
        return None
    update_data = data.model_dump(exclude_unset=True)
    if "hora_llegada" in update_data:
        update_data.pop("hora_llegada")
    if "estatus" in update_data:
        update_data.pop("estatus")
    for key, value in update_data.items():
        if hasattr(retardo, key):
            setattr(retardo, key, value)
    await db.flush()
    await db.refresh(retardo)
    return retardo


async def delete_retardo(db: AsyncSession, id_retardo: int):
    retardo = await get_retardo(db, id_retardo)
    if not retardo:
        return False
    await db.delete(retardo)
    return True
