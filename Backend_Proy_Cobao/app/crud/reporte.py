from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reporte import Reporte
from app.schemas.reporte import ReporteCreate, ReporteUpdate


async def get_reportes(
    db: AsyncSession,
    alumno_id: int | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
):
    stmt = select(Reporte)
    if alumno_id is not None:
        stmt = stmt.where(Reporte.id_alumno == alumno_id)
    if fecha_inicio is not None:
        stmt = stmt.where(Reporte.fecha >= fecha_inicio)
    if fecha_fin is not None:
        stmt = stmt.where(Reporte.fecha <= fecha_fin)
    stmt = stmt.order_by(Reporte.fecha.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_reporte(db: AsyncSession, id_reporte: int):
    result = await db.execute(select(Reporte).where(Reporte.id_reporte == id_reporte))
    return result.scalar_one_or_none()


async def create_reporte(db: AsyncSession, data: ReporteCreate):
    reporte = Reporte(
        id_alumno=data.id_alumno,
        id_prefecto=data.id_prefecto,
        motivo=data.motivo,
        sancion=data.sancion,
        fecha=data.fecha or date.today(),
    )
    db.add(reporte)
    await db.flush()
    await db.refresh(reporte)
    return reporte


async def update_reporte(db: AsyncSession, id_reporte: int, data: ReporteUpdate):
    reporte = await get_reporte(db, id_reporte)
    if not reporte:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        if hasattr(reporte, key):
            setattr(reporte, key, value)
    await db.flush()
    await db.refresh(reporte)
    return reporte


async def delete_reporte(db: AsyncSession, id_reporte: int):
    reporte = await get_reporte(db, id_reporte)
    if not reporte:
        return False
    await db.delete(reporte)
    return True
