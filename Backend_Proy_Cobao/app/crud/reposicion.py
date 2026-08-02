from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reposicion import Reposicion
from app.schemas.reposicion import ReposicionCreate, ReposicionUpdate


async def get_reposiciones(
    db: AsyncSession,
    alumno_id: int | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
):
    stmt = select(Reposicion)
    if alumno_id is not None:
        stmt = stmt.where(Reposicion.id_alumno == alumno_id)
    if fecha_inicio is not None:
        stmt = stmt.where(Reposicion.fecha_solicitud >= fecha_inicio)
    if fecha_fin is not None:
        stmt = stmt.where(Reposicion.fecha_solicitud <= fecha_fin)
    stmt = stmt.order_by(Reposicion.fecha_solicitud.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_reposicion(db: AsyncSession, id_reposicion: int):
    result = await db.execute(
        select(Reposicion).where(Reposicion.id_reposicion == id_reposicion)
    )
    return result.scalar_one_or_none()


async def create_reposicion(db: AsyncSession, data: ReposicionCreate):
    reposicion = Reposicion(
        id_alumno=data.id_alumno,
        id_credencial=data.id_credencial,
        motivo=data.motivo,
        fecha_solicitud=data.fecha_solicitud or date.today(),
        fecha_entrega=data.fecha_entrega,
        id_usuario_registro=data.id_usuario_registro,
    )
    db.add(reposicion)
    await db.flush()
    await db.refresh(reposicion)
    return reposicion


async def update_reposicion(db: AsyncSession, id_reposicion: int, data: ReposicionUpdate):
    reposicion = await get_reposicion(db, id_reposicion)
    if not reposicion:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        if hasattr(reposicion, key):
            setattr(reposicion, key, value)
    await db.flush()
    await db.refresh(reposicion)
    return reposicion


async def delete_reposicion(db: AsyncSession, id_reposicion: int):
    reposicion = await get_reposicion(db, id_reposicion)
    if not reposicion:
        return False
    await db.delete(reposicion)
    return True
