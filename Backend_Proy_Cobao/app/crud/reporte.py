from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud._helpers import build_alumno_dict
from app.models.alumno import Alumno
from app.models.grupo import Grupo
from app.models.reporte import Reporte
from app.models.usuario import Usuario
from app.schemas.reporte import ReporteCreate, ReporteUpdate


def _split_nombre(nombre_completo: str) -> dict:
    parts = (nombre_completo or "").split()
    return {
        "nombre": parts[0] if parts else "",
        "apellido_paterno": parts[1] if len(parts) > 1 else "",
        "apellido_materno": " ".join(parts[2:]) if len(parts) > 2 else "",
    }


def _row_to_dict(reporte: Reporte, alumno: Alumno | None, grupo_nombre: str | None, prefecto: Usuario | None) -> dict:
    alumno_dict = build_alumno_dict(alumno, grupo_nombre) if alumno else None
    prefecto_dict = None
    if prefecto:
        prefecto_dict = {
            "id": prefecto.id_usuario,
            "username": prefecto.username,
            "nombre_completo": prefecto.nombre_completo,
        }
    return {
        "id": reporte.id_reporte,
        "id_alumno": reporte.id_alumno,
        "id_prefecto": reporte.id_prefecto,
        "motivo": reporte.motivo,
        "sancion": reporte.sancion,
        "sancion_cumplida": bool(reporte.sancion_cumplida),
        "fecha": str(reporte.fecha),
        "fecha_registro": str(reporte.fecha_registro) if reporte.fecha_registro else None,
        "alumno": alumno_dict,
        "prefecto": prefecto_dict,
    }


async def get_reportes(
    db: AsyncSession,
    alumno_id: int | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
):
    stmt = (
        select(Reporte, Alumno, Grupo.clave_grupo, Usuario)
        .join(Alumno, Reporte.id_alumno == Alumno.id_alumno)
        .outerjoin(Grupo, Alumno.id_grupo == Grupo.id)
        .outerjoin(Usuario, Reporte.id_prefecto == Usuario.id_usuario)
    )
    if alumno_id is not None:
        stmt = stmt.where(Reporte.id_alumno == alumno_id)
    if fecha_inicio is not None:
        stmt = stmt.where(Reporte.fecha >= fecha_inicio)
    if fecha_fin is not None:
        stmt = stmt.where(Reporte.fecha <= fecha_fin)
    stmt = stmt.order_by(Reporte.fecha.desc())
    result = await db.execute(stmt)
    rows = result.all()
    return [_row_to_dict(reporte, alumno, grupo, prefecto) for reporte, alumno, grupo, prefecto in rows]


async def get_reporte(db: AsyncSession, id_reporte: int):
    result = await db.execute(
        select(Reporte, Alumno, Grupo.clave_grupo, Usuario)
        .join(Alumno, Reporte.id_alumno == Alumno.id_alumno)
        .outerjoin(Grupo, Alumno.id_grupo == Grupo.id)
        .outerjoin(Usuario, Reporte.id_prefecto == Usuario.id_usuario)
        .where(Reporte.id_reporte == id_reporte)
    )
    row = result.first()
    if not row:
        return None
    reporte, alumno, grupo, prefecto = row
    return _row_to_dict(reporte, alumno, grupo, prefecto)


async def create_reporte(db: AsyncSession, data: ReporteCreate):
    reporte = Reporte(
        id_alumno=data.id_alumno,
        id_prefecto=data.id_prefecto,
        motivo=data.motivo,
        sancion=data.sancion,
        fecha=data.fecha or date.today(),
    )
    db.add(reporte)
    await db.flush()
    await db.refresh(reporte)
    return reporte


async def update_reporte(db: AsyncSession, id_reporte: int, data: ReporteUpdate):
    reporte = await db.execute(
        select(Reporte).where(Reporte.id_reporte == id_reporte)
    )
    reporte = reporte.scalar_one_or_none()
    if not reporte:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        if hasattr(reporte, key):
            setattr(reporte, key, value)
    await db.flush()
    return await get_reporte(db, id_reporte)


async def delete_reporte(db: AsyncSession, id_reporte: int):
    result = await db.execute(select(Reporte).where(Reporte.id_reporte == id_reporte))
    reporte = result.scalar_one_or_none()
    if not reporte:
        return False
    await db.delete(reporte)
    return True
