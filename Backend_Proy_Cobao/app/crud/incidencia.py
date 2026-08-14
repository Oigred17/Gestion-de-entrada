from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud._helpers import build_alumno_dict
from app.models.alumno import Alumno
from app.models.grupo import Grupo
from app.models.incidencia import Incidencia
from app.schemas.incidencia import IncidenciaCreate, IncidenciaUpdate

ESTADOS_INCIDENCIA = {"Abierto", "En revision", "Resuelto"}


def _row_to_dict(incidencia: Incidencia, alumno: Alumno | None, grupo_nombre: str | None = None) -> dict:
    alumno_dict = build_alumno_dict(alumno, grupo_nombre) if alumno else None
    return {
        "id": incidencia.id_incidencia,
        "id_alumno": incidencia.id_alumno,
        "tipo": incidencia.tipo,
        "descripcion": incidencia.descripcion,
        "estado": getattr(incidencia, "estado", "Abierto"),
        "notificar": bool(getattr(incidencia, "notificar", False)),
        "evidencia_base64": incidencia.evidencia_base64,
        "id_usuario_registro": incidencia.id_usuario_registro,
        "fecha_registro": str(incidencia.fecha_registro) if incidencia.fecha_registro else None,
        "fecha_resolucion": str(incidencia.fecha_resolucion) if incidencia.fecha_resolucion else None,
        "alumno": alumno_dict,
    }


async def get_incidencias(
    db: AsyncSession,
    alumno_id: int | None = None,
    estado: str | None = None,
):
    stmt = (
        select(Incidencia, Alumno, Grupo.clave_grupo)
        .join(Alumno, Incidencia.id_alumno == Alumno.id_alumno)
        .outerjoin(Grupo, Alumno.id_grupo == Grupo.id)
    )
    if alumno_id is not None:
        stmt = stmt.where(Incidencia.id_alumno == alumno_id)
    if estado is not None:
        stmt = stmt.where(Incidencia.estado == estado)
    stmt = stmt.order_by(Incidencia.fecha_registro.desc())
    result = await db.execute(stmt)
    rows = result.all()
    return [_row_to_dict(incidencia, alumno, grupo) for incidencia, alumno, grupo in rows]


async def get_incidencia(db: AsyncSession, id_incidencia: int):
    result = await db.execute(
        select(Incidencia).where(Incidencia.id_incidencia == id_incidencia)
    )
    return result.scalar_one_or_none()


async def create_incidencia(db: AsyncSession, data: IncidenciaCreate):
    incidencia = Incidencia(
        id_alumno=data.id_alumno,
        tipo=data.tipo,
        descripcion=data.descripcion,
        notificar=data.notificar,
        evidencia_base64=data.evidencia_base64,
        id_usuario_registro=data.id_usuario_registro,
    )
    db.add(incidencia)
    await db.flush()
    await db.refresh(incidencia)
    return incidencia


async def update_incidencia(db: AsyncSession, id_incidencia: int, data: IncidenciaUpdate):
    incidencia = await get_incidencia(db, id_incidencia)
    if not incidencia:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        if hasattr(incidencia, key):
            setattr(incidencia, key, value)
    if getattr(data, "estado", None) == "Resuelto":
        incidencia.fecha_resolucion = datetime.now()
    await db.flush()
    await db.refresh(incidencia)
    return incidencia


async def delete_incidencia(db: AsyncSession, id_incidencia: int):
    incidencia = await get_incidencia(db, id_incidencia)
    if not incidencia:
        return False
    await db.delete(incidencia)
    return True
