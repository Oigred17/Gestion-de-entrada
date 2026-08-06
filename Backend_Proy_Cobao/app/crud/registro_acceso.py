from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credencial import Credencial
from app.models.registro_acceso import RegistroAcceso
from app.schemas.registro_acceso import RegistroAccesoCreate


async def get_registros(
    db: AsyncSession,
    credencial_id: int | None = None,
    alumno_id: int | None = None,
    fecha_inicio: datetime | None = None,
    fecha_fin: datetime | None = None,
):
    stmt = (
        select(RegistroAcceso, Credencial.id_alumno.label("alumno_id_resolved"))
        .join(Credencial, RegistroAcceso.id_credencial == Credencial.id_credencial)
    )
    if credencial_id is not None:
        stmt = stmt.where(RegistroAcceso.id_credencial == credencial_id)
    if alumno_id is not None:
        stmt = stmt.where(Credencial.id_alumno == alumno_id)
    if fecha_inicio is not None:
        stmt = stmt.where(RegistroAcceso.fecha_hora >= fecha_inicio)
    if fecha_fin is not None:
        stmt = stmt.where(RegistroAcceso.fecha_hora <= fecha_fin)
    stmt = stmt.order_by(RegistroAcceso.fecha_hora.desc())
    result = await db.execute(stmt)
    rows = result.all()
    return [
        {
            "id": row[0].id_registro,
            "alumno_id": row[1],
            "credencial_id": row[0].id_credencial,
            "fecha_hora": row[0].fecha_hora,
            "tipo_acceso": row[0].tipo_evento,
            "ubicacion": "",
            "estatus": "Activo",
            "created_at": None,
            "updated_at": None,
            "alumno": None,
            "credencial": None,
        }
        for row in rows
    ]


async def get_registro(db: AsyncSession, id_registro: int):
    result = await db.execute(
        select(RegistroAcceso).where(RegistroAcceso.id_registro == id_registro)
    )
    return result.scalar_one_or_none()


async def count_registros_by_credencial(db: AsyncSession, id_credencial: int) -> int:
    result = await db.execute(
        select(func.count()).where(RegistroAcceso.id_credencial == id_credencial)
    )
    return result.scalar() or 0


async def create_registro(db: AsyncSession, data: RegistroAccesoCreate):
    registro = RegistroAcceso(
        id_credencial=data.resolved_credencial_id,
        tipo_evento=data.resolved_tipo_evento,
    )
    db.add(registro)
    await db.flush()
    await db.refresh(registro)
    return registro


async def delete_registro(db: AsyncSession, id_registro: int):
    registro = await get_registro(db, id_registro)
    if not registro:
        return False
    await db.delete(registro)
    return True
