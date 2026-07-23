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
        numero_empleado=data.resolved_numero_empleado,
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
    nombre_parts = []
    if "nombre" in update_data or "apellido_paterno" in update_data or "apellido_materno" in update_data:
        nombre = update_data.pop("nombre", None)
        ap = update_data.pop("apellido_paterno", None)
        am = update_data.pop("apellido_materno", None)
        if nombre is not None:
            nombre_parts.append(nombre)
        elif profesor.nombre_completo:
            nombre_parts.append(profesor.nombre_completo.split()[0] if profesor.nombre_completo.split() else "")
        if ap is not None:
            nombre_parts.append(ap)
        elif profesor.nombre_completo and len(profesor.nombre_completo.split()) > 1:
            nombre_parts.append(profesor.nombre_completo.split()[1])
        if am is not None:
            nombre_parts.append(am)
        elif profesor.nombre_completo and len(profesor.nombre_completo.split()) > 2:
            nombre_parts.extend(profesor.nombre_completo.split()[2:])
        update_data["nombre_completo"] = " ".join(p for p in nombre_parts if p)
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
