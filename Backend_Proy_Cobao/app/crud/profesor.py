from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profesor import Profesor
from app.schemas.profesor import ProfesorCreate, ProfesorUpdate


async def get_profesores(db: AsyncSession, solo_activos: bool = False):
    stmt = select(Profesor)
    if solo_activos:
        stmt = stmt.where(Profesor.activo == True)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_profesor(db: AsyncSession, id_profesor: int):
    result = await db.execute(select(Profesor).where(Profesor.id_profesor == id_profesor))
    return result.scalar_one_or_none()


async def create_profesor(db: AsyncSession, data: ProfesorCreate):
    profesor = Profesor(
        num_nomina=data.num_nomina,
        nombre_completo=data.nombre_completo,
        telefono=data.telefono,
        domicilio=data.domicilio,
        activo=data.resolved_activo,
    )
    db.add(profesor)
    await db.flush()
    await db.refresh(profesor)
    return profesor


async def update_profesor(db: AsyncSession, id_profesor: int, data: ProfesorUpdate):
    profesor = await get_profesor(db, id_profesor)
    if not profesor:
        return None
    update_data = data.model_dump(exclude_unset=True)
    if "estatus" in update_data:
        estatus = update_data.pop("estatus")
        if estatus is not None:
            update_data["activo"] = estatus.lower() not in ("inactivo", "baja")
    for key, value in update_data.items():
        if hasattr(profesor, key):
            setattr(profesor, key, value)
    await db.flush()
    await db.refresh(profesor)
    return profesor


async def delete_profesor(db: AsyncSession, id_profesor: int):
    profesor = await get_profesor(db, id_profesor)
    if not profesor:
        return False
    await db.delete(profesor)
    return True
