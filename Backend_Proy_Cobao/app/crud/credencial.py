from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credencial import Credencial
from app.schemas.credencial import CredencialCreate, CredencialUpdate


async def get_credenciales(
    db: AsyncSession,
    alumno_id: int | None = None,
    profesor_id: int | None = None,
    solo_activas: bool = False,
):
    stmt = select(Credencial)
    if alumno_id is not None:
        stmt = stmt.where(Credencial.id_alumno == alumno_id)
    if profesor_id is not None:
        stmt = stmt.where(Credencial.id_profesor == profesor_id)
    if solo_activas:
        stmt = stmt.where(Credencial.activa == True)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_credencial(db: AsyncSession, id_credencial: int):
    result = await db.execute(
        select(Credencial).where(Credencial.id_credencial == id_credencial)
    )
    return result.scalar_one_or_none()


async def get_credencial_by_uid(db: AsyncSession, uid_nfc: str):
    result = await db.execute(
        select(Credencial).where(Credencial.uid_nfc == uid_nfc)
    )
    return result.scalar_one_or_none()


async def create_credencial(db: AsyncSession, data: CredencialCreate):
    credencial = Credencial(
        uid_nfc=data.resolved_uid_nfc,
        id_alumno=data.resolved_id_alumno,
        id_profesor=data.id_profesor,
        activa=data.resolved_activa,
        fecha_vencimiento=data.resolved_fecha_vencimiento,
    )
    db.add(credencial)
    await db.flush()
    await db.refresh(credencial)
    return credencial


async def update_credencial(
    db: AsyncSession, id_credencial: int, data: CredencialUpdate
):
    credencial = await get_credencial(db, id_credencial)
    if not credencial:
        return None
    update_data = data.model_dump(exclude_unset=True)
    uid = update_data.pop("numero", None)
    if uid is not None:
        update_data["uid_nfc"] = uid
    if "estatus" in update_data:
        estatus = update_data.pop("estatus")
        update_data["activa"] = estatus.upper() in ("ACTIVA", "ACTIVE", "ACTIVO") if estatus else True
    if "alumno_id" in update_data:
        update_data["id_alumno"] = update_data.pop("alumno_id")
    if "fecha_expiracion" in update_data:
        update_data["fecha_vencimiento"] = update_data.pop("fecha_expiracion")
    for key, value in update_data.items():
        if hasattr(credencial, key):
            setattr(credencial, key, value)
    await db.flush()
    await db.refresh(credencial)
    return credencial


async def delete_credencial(db: AsyncSession, id_credencial: int):
    credencial = await get_credencial(db, id_credencial)
    if not credencial:
        return False
    await db.delete(credencial)
    return True
