from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ciclo_escolar import CicloEscolar
from app.models.grupo import Grupo
from app.schemas.grupo import GrupoCreate, GrupoUpdate


async def get_grupos(db: AsyncSession, ciclo_id: int | None = None):
    stmt = select(Grupo)
    if ciclo_id is not None:
        stmt = stmt.where(Grupo.ciclo_escolar_id == ciclo_id)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_grupo(db: AsyncSession, grupo_id: int):
    result = await db.execute(select(Grupo).where(Grupo.id == grupo_id))
    return result.scalar_one_or_none()


async def _get_or_create_default_ciclo(db: AsyncSession) -> int:
    result = await db.execute(select(CicloEscolar).where(CicloEscolar.activo == True).limit(1))
    ciclo = result.scalar_one_or_none()
    if not ciclo:
        result = await db.execute(select(CicloEscolar).limit(1))
        ciclo = result.scalar_one_or_none()
    if ciclo:
        return ciclo.id
    from datetime import date
    nuevo = CicloEscolar(nombre="Actual", fecha_inicio=date.today(), fecha_fin=date(date.today().year, 12, 31), activo=True)
    db.add(nuevo)
    await db.flush()
    await db.refresh(nuevo)
    return nuevo.id


async def create_grupo(db: AsyncSession, data: GrupoCreate):
    clave = data.clave_grupo or 0
    ciclo_id = data.ciclo_escolar_id
    if ciclo_id is None:
        ciclo_id = await _get_or_create_default_ciclo(db)
    grupo = Grupo(
        clave_grupo=clave,
        ciclo_escolar_id=ciclo_id,
    )
    db.add(grupo)
    await db.flush()
    await db.refresh(grupo)
    return grupo


async def update_grupo(db: AsyncSession, grupo_id: int, data: GrupoUpdate):
    grupo = await get_grupo(db, grupo_id)
    if not grupo:
        return None
    update_data = data.model_dump(exclude_unset=True)
    update_data.pop("nombre", None)
    update_data.pop("descripcion", None)
    update_data.pop("profesor_id", None)
    update_data.pop("estatus", None)
    for key, value in update_data.items():
        if hasattr(grupo, key):
            setattr(grupo, key, value)
    await db.flush()
    await db.refresh(grupo)
    return grupo


async def delete_grupo(db: AsyncSession, grupo_id: int):
    grupo = await get_grupo(db, grupo_id)
    if not grupo:
        return False
    await db.delete(grupo)
    return True
