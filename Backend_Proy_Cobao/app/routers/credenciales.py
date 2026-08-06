from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.crud import credencial as crud_credencial
from app.crud import registro_acceso as crud_registro
from app.database import get_db
from app.schemas.credencial import (
    CredencialCreate,
    CredencialResponse,
    CredencialUpdate,
)

router = APIRouter(prefix="/credenciales", tags=["Credenciales"])

MSG_CHIP_YA_ASIGNADO = (
    "Este chip NFC ya esta asignado a otra credencial. Usa un chip diferente."
)

MSG_ALUMNO_YA_TIENE_CREDENCIAL = (
    "El alumno ya tiene una credencial activa (UID: {uid}). Para asignar una "
    "nueva credencial primero da de baja o elimina la credencial anterior."
)


def _resolver_uid_nuevo(data: CredencialUpdate) -> str | None:
    update_data = data.model_dump(exclude_unset=True)
    uid = update_data.get("numero") or update_data.get("uid_nfc")
    return uid


def _resolver_alumno_y_activa(credencial, data: CredencialUpdate):
    update_data = data.model_dump(exclude_unset=True)

    id_alumno = credencial.id_alumno
    if update_data.get("alumno_id") is not None:
        id_alumno = update_data["alumno_id"]
    if update_data.get("id_alumno") is not None:
        id_alumno = update_data["id_alumno"]

    activa = credencial.activa
    if "activa" in update_data and update_data["activa"] is not None:
        activa = update_data["activa"]
    if "estatus" in update_data:
        estatus = update_data["estatus"]
        activa = estatus.upper() in ("ACTIVA", "ACTIVE", "ACTIVO") if estatus else True

    return id_alumno, activa


@router.get("/", response_model=list[CredencialResponse])
async def listar_credenciales(
    alumno_id: int | None = Query(None),
    profesor_id: int | None = Query(None),
    solo_activas: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    return await crud_credencial.get_credenciales(
        db, alumno_id=alumno_id, profesor_id=profesor_id, solo_activas=solo_activas
    )


@router.get("/{id_credencial}", response_model=CredencialResponse)
async def obtener_credencial(
    id_credencial: int, db: AsyncSession = Depends(get_db)
):
    credencial = await crud_credencial.get_credencial(db, id_credencial)
    if not credencial:
        raise HTTPException(status_code=404, detail="Credencial no encontrada")
    return credencial


@router.get("/nfc/{uid_nfc}", response_model=CredencialResponse)
async def obtener_credencial_por_uid(
    uid_nfc: str, db: AsyncSession = Depends(get_db)
):
    credencial = await crud_credencial.get_credencial_by_uid(db, uid_nfc)
    if not credencial:
        raise HTTPException(status_code=404, detail="Credencial no encontrada")
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    from app.models.alumno import Alumno
    from app.models.credencial import Credencial as CredencialModel
    result = await db.execute(
        select(CredencialModel, Alumno).outerjoin(Alumno, CredencialModel.id_alumno == Alumno.id_alumno).where(CredencialModel.uid_nfc == uid_nfc)
    )
    row = result.first()
    if row:
        cred, alumno = row
        resp = CredencialResponse.model_validate(cred, from_attributes=True)
        if alumno:
            resp.alumno = {
                "id": alumno.id_alumno,
                "nombre": alumno.nombre_completo,
                "matricula": alumno.matricula,
            }
        return resp
    return credencial


@router.post("/", response_model=CredencialResponse, status_code=201)
async def crear_credencial(
    data: CredencialCreate, db: AsyncSession = Depends(get_db)
):
    uid_nfc = data.resolved_uid_nfc
    id_alumno = data.resolved_id_alumno

    if uid_nfc:
        if await crud_credencial.get_credencial_by_uid(db, uid_nfc):
            raise HTTPException(status_code=409, detail=MSG_CHIP_YA_ASIGNADO)

    if id_alumno is not None:
        credencial_existente = await crud_credencial.get_credencial_activa_by_alumno(
            db, id_alumno
        )
        if credencial_existente:
            raise HTTPException(
                status_code=409,
                detail=MSG_ALUMNO_YA_TIENE_CREDENCIAL.format(
                    uid=credencial_existente.uid_nfc
                ),
            )

    try:
        return await crud_credencial.create_credencial(db, data)
    except IntegrityError:
        raise HTTPException(status_code=409, detail=MSG_CHIP_YA_ASIGNADO)


@router.put("/{id_credencial}", response_model=CredencialResponse)
async def actualizar_credencial(
    id_credencial: int,
    data: CredencialUpdate,
    db: AsyncSession = Depends(get_db),
):
    credencial = await crud_credencial.get_credencial(db, id_credencial)
    if not credencial:
        raise HTTPException(status_code=404, detail="Credencial no encontrada")

    nuevo_uid = _resolver_uid_nuevo(data)
    if nuevo_uid:
        otro = await crud_credencial.get_credencial_by_uid_excluding(
            db, nuevo_uid, id_credencial
        )
        if otro:
            raise HTTPException(status_code=409, detail=MSG_CHIP_YA_ASIGNADO)

    nuevo_id_alumno, nueva_activa = _resolver_alumno_y_activa(credencial, data)
    if nuevo_id_alumno is not None and nueva_activa:
        otro = await crud_credencial.get_credencial_activa_by_alumno(
            db, nuevo_id_alumno
        )
        if otro and otro.id_credencial != id_credencial:
            raise HTTPException(
                status_code=409,
                detail=MSG_ALUMNO_YA_TIENE_CREDENCIAL.format(uid=otro.uid_nfc),
            )

    try:
        credencial = await crud_credencial.update_credencial(db, id_credencial, data)
    except IntegrityError:
        raise HTTPException(status_code=409, detail=MSG_CHIP_YA_ASIGNADO)
    if not credencial:
        raise HTTPException(status_code=404, detail="Credencial no encontrada")
    return credencial


@router.delete("/{id_credencial}", status_code=204)
async def eliminar_credencial(
    id_credencial: int, db: AsyncSession = Depends(get_db)
):
    credencial = await crud_credencial.get_credencial(db, id_credencial)
    if not credencial:
        raise HTTPException(status_code=404, detail="Credencial no encontrada")

    registros = await crud_registro.count_registros_by_credencial(
        db, id_credencial
    )
    if registros > 0:
        raise HTTPException(
            status_code=409,
            detail=(
                "La credencial tiene registros de acceso asociados y no se puede "
                "eliminar para conservar el historial del alumno. Da de baja la "
                "credencial (estatus Inactiva) para impedir su uso y poder asignar "
                "una nueva."
            ),
        )

    if not await crud_credencial.delete_credencial(db, id_credencial):
        raise HTTPException(status_code=404, detail="Credencial no encontrada")
