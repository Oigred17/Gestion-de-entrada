from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud._helpers import build_alumno_dict
from app.models.alumno import Alumno
from app.models.grupo import Grupo
from app.models.permiso import Permiso
from app.schemas.permiso import PermisoCreate, PermisoUpdate

ESTADOS_PERMISO = {"Pendiente", "Aprobado", "Rechazado", "Vencido", "Utilizado"}


def _row_to_dict(permiso: Permiso, alumno: Alumno | None, grupo_nombre: str | None = None) -> dict:
    alumno_dict = build_alumno_dict(alumno, grupo_nombre) if alumno else None
    return {
        "id": permiso.id_permiso,
        "id_alumno": permiso.id_alumno,
        "motivo": permiso.motivo,
        "fecha_salida": str(permiso.fecha_salida) if permiso.fecha_salida else None,
        "fecha_solicitud": str(permiso.fecha_solicitud) if permiso.fecha_solicitud else None,
        "estado": getattr(permiso, "estado", "Pendiente"),
        "codigo_autorizacion": permiso.codigo_autorizacion,
        "notificar_tutor": bool(getattr(permiso, "notificar_tutor", False)),
        "id_usuario_registro": permiso.id_usuario_registro,
        "fecha_registro": str(permiso.fecha_registro) if permiso.fecha_registro else None,
        "alumno": alumno_dict,
    }


async def get_permisos(
    db: AsyncSession,
    alumno_id: int | None = None,
    estado: str | None = None,
):
    stmt = (
        select(Permiso, Alumno, Grupo.clave_grupo)
        .join(Alumno, Permiso.id_alumno == Alumno.id_alumno)
        .outerjoin(Grupo, Alumno.id_grupo == Grupo.id)
    )
    if alumno_id is not None:
        stmt = stmt.where(Permiso.id_alumno == alumno_id)
    if estado is not None:
        stmt = stmt.where(Permiso.estado == estado)
    stmt = stmt.order_by(Permiso.fecha_solicitud.desc())
    result = await db.execute(stmt)
    rows = result.all()
    return [_row_to_dict(permiso, alumno, grupo) for permiso, alumno, grupo in rows]


async def get_permiso(db: AsyncSession, id_permiso: int):
    result = await db.execute(
        select(Permiso).where(Permiso.id_permiso == id_permiso)
    )
    return result.scalar_one_or_none()


async def get_permiso_by_codigo(db: AsyncSession, codigo: str):
    result = await db.execute(
        select(Permiso).where(Permiso.codigo_autorizacion == codigo)
    )
    return result.scalar_one_or_none()


async def create_permiso(db: AsyncSession, data: PermisoCreate):
    permiso = Permiso(
        id_alumno=data.id_alumno,
        motivo=data.motivo,
        fecha_salida=data.fecha_salida,
        notificar_tutor=data.notificar_tutor,
        id_usuario_registro=data.id_usuario_registro,
    )
    db.add(permiso)
    await db.flush()
    await db.refresh(permiso)
    return permiso


async def update_permiso(db: AsyncSession, id_permiso: int, data: PermisoUpdate):
    permiso = await get_permiso(db, id_permiso)
    if not permiso:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        if hasattr(permiso, key):
            setattr(permiso, key, value)
    await db.flush()
    await db.refresh(permiso)
    return permiso


async def delete_permiso(db: AsyncSession, id_permiso: int):
    permiso = await get_permiso(db, id_permiso)
    if not permiso:
        return False
    await db.delete(permiso)
    return True
