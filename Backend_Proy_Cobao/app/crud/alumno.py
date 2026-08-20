import uuid

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alumno import Alumno
from app.models.ciclo_escolar import CicloEscolar
from app.models.grupo import Grupo
from app.schemas.alumno import AlumnoCreate, AlumnoUpdate

# Columnas nullable: "" desde el formulario debe ser NULL (si no, falla CHECK/UNIQUE)
_NULLABLE_EMPTY = {
    "nss",
    "tipo_sangre",
    "capacitacion",
    "turno",
    "cohorte",
    "fecha_nacimiento",
    "domicilio",
    "direccion",
    "tutor_nombre",
    "tutor_telefono",
    "telefono",
}


def _empty_to_none(value):
    if isinstance(value, str) and not value.strip():
        return None
    return value


async def get_alumnos(
    db: AsyncSession,
    solo_activos: bool = False,
    estatus: str | None = None,
    search: str | None = None,
    ciclo_id: int | None = None,
    ciclo_nombre: str | None = None,
):
    stmt = select(Alumno)
    if ciclo_nombre:
        normalizado = ciclo_nombre.strip().upper()
        stmt = stmt.where(Alumno.cohorte == normalizado)
    elif ciclo_id is not None:
        ciclo_nombre = (
            await db.execute(select(CicloEscolar.nombre).where(CicloEscolar.id == ciclo_id))
        ).scalar_one_or_none()
        grupos_ciclo = select(Grupo.id).where(Grupo.ciclo_escolar_id == ciclo_id)
        if ciclo_nombre:
            stmt = stmt.where(or_(Alumno.cohorte == ciclo_nombre, Alumno.id_grupo.in_(grupos_ciclo)))
        else:
            stmt = stmt.where(Alumno.id_grupo.in_(grupos_ciclo))
    if solo_activos:
        stmt = stmt.where(Alumno.activo == True)
    if estatus:
        stmt = stmt.where(Alumno.estatus == estatus)
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
        nss=_empty_to_none(data.nss),
        tipo_sangre=_empty_to_none(data.tipo_sangre),
        capacitacion=_empty_to_none(data.capacitacion),
        turno=_empty_to_none(data.turno),
        cohorte=_empty_to_none(data.cohorte),
        fecha_nacimiento=_empty_to_none(data.fecha_nacimiento),
        domicilio=_empty_to_none(data.direccion),
        tutor_nombre=_empty_to_none(data.tutor_nombre),
        tutor_telefono=_empty_to_none(data.tutor_telefono or data.telefono),
        activo=data.activo,
        estatus=data.estatus if data.estatus else ("Activo" if data.activo else "Inactivo"),
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
    raw_keys = set(update_data.keys())
    for key in list(update_data.keys()):
        if key in _NULLABLE_EMPTY:
            update_data[key] = _empty_to_none(update_data[key])
    estatus = update_data.pop("estatus", None)
    if estatus is not None:
        update_data["estatus"] = estatus
        update_data["activo"] = estatus.lower() not in ("inactivo", "baja", "egresado")
    if "direccion" in raw_keys:
        update_data["domicilio"] = update_data.pop("direccion", None)
    if "telefono" in raw_keys:
        update_data["tutor_telefono"] = update_data.pop("telefono", None)
    # CURP es NOT NULL + UNIQUE: si llega vacío, generar placeholder (como en create)
    if "curp" in update_data and not update_data["curp"]:
        update_data["curp"] = f"SIN{uuid.uuid4().hex[:15].upper()}"
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
