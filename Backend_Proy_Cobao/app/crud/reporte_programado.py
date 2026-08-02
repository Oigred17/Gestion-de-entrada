from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reporte_programado import ReporteProgramado
from app.schemas.reporte_programado import (
    ReporteProgramadoCreate,
    ReporteProgramadoUpdate,
)


async def get_reportes_programados(db: AsyncSession):
    stmt = select(ReporteProgramado).order_by(ReporteProgramado.nombre.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_reporte_programado(db: AsyncSession, id_reporte: int):
    result = await db.execute(
        select(ReporteProgramado).where(ReporteProgramado.id_reporte_programado == id_reporte)
    )
    return result.scalar_one_or_none()


async def create_reporte_programado(db: AsyncSession, data: ReporteProgramadoCreate):
    reporte = ReporteProgramado(
        nombre=data.nombre,
        frecuencia=data.frecuencia,
        ultima_generacion=data.ultima_generacion,
        proxima_generacion=data.proxima_generacion,
        destinatarios=data.destinatarios,
        activo=data.activo,
    )
    db.add(reporte)
    await db.flush()
    await db.refresh(reporte)
    return reporte


async def update_reporte_programado(db: AsyncSession, id_reporte: int, data: ReporteProgramadoUpdate):
    reporte = await get_reporte_programado(db, id_reporte)
    if not reporte:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        if hasattr(reporte, key):
            setattr(reporte, key, value)
    await db.flush()
    await db.refresh(reporte)
    return reporte


async def delete_reporte_programado(db: AsyncSession, id_reporte: int):
    reporte = await get_reporte_programado(db, id_reporte)
    if not reporte:
        return False
    await db.delete(reporte)
    return True
