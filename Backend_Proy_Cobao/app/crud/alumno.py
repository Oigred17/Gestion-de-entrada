import uuid

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alumno import Alumno
from app.models.grupo import Grupo
from app.schemas.alumno import AlumnoCreate, AlumnoUpdate


async def get_alumnos(db: AsyncSession, solo_activos: bool = False, search: str | None = None):
    stmt = select(Alumno)
    if solo_activos:
        stmt = stmt.where(Alumno.activo == True)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                Alumno.matricula.ilike(pattern),
                Alumno.nombre_completo.ilike(pattern),
                Alumno.curp.ilike(pattern),
            )
        )
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_alumno(db: AsyncSession, id_alumno: int):
    result = await db.execute(select(Alumno).where(Alumno.id_alumno == id_alumno))
    return result.scalar_one_or_none()


async def get_alumno_by_matricula(db: AsyncSession, matricula: str):
    result = await db.execute(select(Alumno).where(Alumno.matricula == matricula))
    return result.scalar_one_or_none()


async def create_alumno(db: AsyncSession, data: AlumnoCreate):
    curp = data.curp
    if not curp:
        curp = f"SIN{uuid.uuid4().hex[:15].upper()}"

    id_grupo = data.id_grupo
    if id_grupo is not None:
        result = await db.execute(select(Grupo.id).where(Grupo.id == id_grupo))
        if result.scalar_one_or_none() is None:
            id_grupo = None

    alumno = Alumno(
        matricula=data.matricula,
        nombre_completo=data.nombre_completo,
        curp=curp,
        nss=data.nss,
        tipo_sangre=data.tipo_sangre,
        domicilio=data.direccion,
        tutor_nombre=data.tutor_nombre,
        tutor_telefono=data.tutor_telefono or data.telefono,
        activo=data.activo,
        id_grupo=id_grupo,
    )
    db.add(alumno)
    await db.flush()
    await db.refresh(alumno)
    return alumno


async def update_alumno(db: AsyncSession, id_alumno: int, data: AlumnoUpdate):
    alumno = await get_alumno(db, id_alumno)
    if not alumno:
        return None
    update_data = data.model_dump(exclude_unset=True)
    update_data.pop("estatus", None)
    direccion = update_data.pop("direccion", None)
    if direccion is not None:
        update_data["domicilio"] = direccion
    telefono = update_data.pop("telefono", None)
    if telefono is not None:
        update_data["tutor_telefono"] = telefono
    nombre_parts = []
    if "nombre" in update_data or "apellido_paterno" in update_data or "apellido_materno" in update_data:
        nombre = update_data.pop("nombre", None)
        ap = update_data.pop("apellido_paterno", None)
        am = update_data.pop("apellido_materno", None)
        if nombre is not None:
            nombre_parts.append(nombre)
        elif alumno.nombre_completo:
            nombre_parts.append(alumno.nombre_completo.split()[0] if alumno.nombre_completo.split() else "")
        if ap is not None:
            nombre_parts.append(ap)
        elif alumno.nombre_completo and len(alumno.nombre_completo.split()) > 1:
            nombre_parts.append(alumno.nombre_completo.split()[1])
        if am is not None:
            nombre_parts.append(am)
        elif alumno.nombre_completo and len(alumno.nombre_completo.split()) > 2:
            nombre_parts.extend(alumno.nombre_completo.split()[2:])
        update_data["nombre_completo"] = " ".join(p for p in nombre_parts if p)
    for key, value in update_data.items():
        if hasattr(alumno, key):
            setattr(alumno, key, value)
    await db.flush()
    await db.refresh(alumno)
    return alumno


async def delete_alumno(db: AsyncSession, id_alumno: int):
    alumno = await get_alumno(db, id_alumno)
    if not alumno:
        return False
    await db.delete(alumno)
    return True
