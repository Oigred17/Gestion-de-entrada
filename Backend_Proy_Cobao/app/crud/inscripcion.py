from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inscripcion import Inscripcion
from app.schemas.inscripcion import InscripcionCreate, InscripcionUpdate


async def get_inscripciones(
    db: AsyncSession,
    alumno_id: int | None = None,
    ciclo_id: int | None = None,
    grupo_id: int | None = None,
):
    stmt = select(Inscripcion)
    if alumno_id is not None:
        stmt = stmt.where(Inscripcion.id_alumno == alumno_id)
    if ciclo_id is not None:
        stmt = stmt.where(Inscripcion.ciclo_escolar_id == ciclo_id)
    if grupo_id is not None:
        stmt = stmt.where(Inscripcion.id_grupo == grupo_id)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_inscripcion(db: AsyncSession, inscripcion_id: int):
    result = await db.execute(
        select(Inscripcion).where(Inscripcion.id == inscripcion_id)
    )
    return result.scalar_one_or_none()


async def create_inscripcion(db: AsyncSession, data: InscripcionCreate):
    inscripcion = Inscripcion(
        id_alumno=data.resolved_alumno_id,
        id_grupo=data.resolved_grupo_id,
        ciclo_escolar_id=data.ciclo_escolar_id,
    )
    db.add(inscripcion)
    await db.flush()
    await db.refresh(inscripcion)
    return inscripcion


async def update_inscripcion(
    db: AsyncSession, inscripcion_id: int, data: InscripcionUpdate
):
    inscripcion = await get_inscripcion(db, inscripcion_id)
    if not inscripcion:
        return None
    update_data = data.model_dump(exclude_unset=True)
    if "grupo_id" in update_data:
        update_data["id_grupo"] = update_data.pop("grupo_id")
    if "estatus" in update_data:
        update_data.pop("estatus")
    for key, value in update_data.items():
        if hasattr(inscripcion, key):
            setattr(inscripcion, key, value)
    await db.flush()
    await db.refresh(inscripcion)
    return inscripcion


async def delete_inscripcion(db: AsyncSession, inscripcion_id: int):
    inscripcion = await get_inscripcion(db, inscripcion_id)
    if not inscripcion:
        return False
    await db.delete(inscripcion)
    return True
