from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ciclo_escolar import CicloEscolar
from app.schemas.ciclo_escolar import CicloEscolarCreate, CicloEscolarUpdate


async def get_ciclos(db: AsyncSession):
    result = await db.execute(select(CicloEscolar))
    return result.scalars().all()


async def get_ciclo(db: AsyncSession, ciclo_id: int):
    result = await db.execute(select(CicloEscolar).where(CicloEscolar.id == ciclo_id))
    return result.scalar_one_or_none()


async def get_ciclo_activo(db: AsyncSession):
    result = await db.execute(
        select(CicloEscolar).where(CicloEscolar.activo == True)
    )
    return result.scalar_one_or_none()


async def create_ciclo(db: AsyncSession, data: CicloEscolarCreate):
    ciclo = CicloEscolar(
        nombre=data.nombre,
        fecha_inicio=data.fecha_inicio,
        fecha_fin=data.fecha_fin,
        activo=data.resolved_activo,
    )
    db.add(ciclo)
    await db.flush()
    await db.refresh(ciclo)
    return ciclo


async def update_ciclo(db: AsyncSession, ciclo_id: int, data: CicloEscolarUpdate):
    ciclo = await get_ciclo(db, ciclo_id)
    if not ciclo:
        return None
    update_data = data.model_dump(exclude_unset=True)
    if "estatus" in update_data:
        estatus = update_data.pop("estatus")
        if estatus is not None:
            update_data["activo"] = estatus.lower() not in ("inactivo", "cerrado")
    for key, value in update_data.items():
        if hasattr(ciclo, key):
            setattr(ciclo, key, value)
    await db.flush()
    await db.refresh(ciclo)
    return ciclo


async def delete_ciclo(db: AsyncSession, ciclo_id: int):
    ciclo = await get_ciclo(db, ciclo_id)
    if not ciclo:
        return False
    await db.delete(ciclo)
    return True
