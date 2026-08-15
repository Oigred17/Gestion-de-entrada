from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud._helpers import build_alumno_dict
from app.models.alumno import Alumno
from app.models.falta_asistencia import FaltaAsistencia
from app.models.grupo import Grupo


def _row_to_dict(falta: FaltaAsistencia, alumno: Alumno | None, grupo_nombre: str | None = None) -> dict:
    alumno_dict = build_alumno_dict(alumno, grupo_nombre) if alumno else None
    return {
        "id": falta.id_falta,
        "id_alumno": falta.id_alumno,
        "fecha": str(falta.fecha),
        "tipo": falta.tipo,
        "motivo": falta.motivo,
        "fecha_registro": str(falta.fecha_registro) if falta.fecha_registro else None,
        "alumno": alumno_dict,
    }


async def get_faltas(
    db: AsyncSession,
    alumno_id: int | None = None,
    tipo: str | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
):
    stmt = (
        select(FaltaAsistencia, Alumno, Grupo.clave_grupo)
        .join(Alumno, FaltaAsistencia.id_alumno == Alumno.id_alumno)
        .outerjoin(Grupo, Alumno.id_grupo == Grupo.id)
    )
    if alumno_id is not None:
        stmt = stmt.where(FaltaAsistencia.id_alumno == alumno_id)
    if tipo is not None:
        stmt = stmt.where(FaltaAsistencia.tipo == tipo)
    if fecha_inicio is not None:
        stmt = stmt.where(FaltaAsistencia.fecha >= fecha_inicio)
    if fecha_fin is not None:
        stmt = stmt.where(FaltaAsistencia.fecha <= fecha_fin)
    stmt = stmt.order_by(FaltaAsistencia.fecha.desc(), Alumno.nombre_completo.asc())
    result = await db.execute(stmt)
    rows = result.all()
    return [_row_to_dict(falta, alumno, grupo) for falta, alumno, grupo in rows]


async def contar_faltas(db: AsyncSession, fecha: date | None = None, tipo: str | None = None) -> int:
    stmt = select(FaltaAsistencia.id_falta)
    if fecha is not None:
        stmt = stmt.where(FaltaAsistencia.fecha == fecha)
    if tipo is not None:
        stmt = stmt.where(FaltaAsistencia.tipo == tipo)
    result = await db.execute(stmt)
    return len(result.scalars().all())


async def delete_falta(db: AsyncSession, id_falta: int) -> bool:
    result = await db.execute(select(FaltaAsistencia).where(FaltaAsistencia.id_falta == id_falta))
    falta = result.scalar_one_or_none()
    if not falta:
        return False
    await db.delete(falta)
    return True
