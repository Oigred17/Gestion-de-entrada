from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rol import Rol
from app.schemas.rol import RolCreate, RolUpdate


async def get_roles(db: AsyncSession):
    result = await db.execute(select(Rol))
    return result.scalars().all()


async def get_rol(db: AsyncSession, id_rol: int):
    result = await db.execute(select(Rol).where(Rol.id_rol == id_rol))
    return result.scalar_one_or_none()


async def create_rol(db: AsyncSession, data: RolCreate):
    rol = Rol(**data.model_dump())
    db.add(rol)
    await db.flush()
    await db.refresh(rol)
    return rol


async def update_rol(db: AsyncSession, id_rol: int, data: RolUpdate):
    rol = await get_rol(db, id_rol)
    if not rol:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(rol, key, value)
    await db.flush()
    await db.refresh(rol)
    return rol


async def delete_rol(db: AsyncSession, id_rol: int):
    rol = await get_rol(db, id_rol)
    if not rol:
        return False
    await db.delete(rol)
    return True
