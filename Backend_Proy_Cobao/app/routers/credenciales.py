from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.crud import credencial as crud_credencial
from app.database import get_db
from app.schemas.credencial import (
    CredencialCreate,
    CredencialResponse,
    CredencialUpdate,
)

router = APIRouter(prefix="/credenciales", tags=["Credenciales"])


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
    try:
        return await crud_credencial.create_credencial(db, data)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Este chip NFC ya esta asignado a otra credencial. Usa un chip diferente.")


@router.put("/{id_credencial}", response_model=CredencialResponse)
async def actualizar_credencial(
    id_credencial: int,
    data: CredencialUpdate,
    db: AsyncSession = Depends(get_db),
):
    try:
        credencial = await crud_credencial.update_credencial(db, id_credencial, data)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Este chip NFC ya esta asignado a otra credencial.")
    if not credencial:
        raise HTTPException(status_code=404, detail="Credencial no encontrada")
    return credencial


@router.delete("/{id_credencial}", status_code=204)
async def eliminar_credencial(
    id_credencial: int, db: AsyncSession = Depends(get_db)
):
    if not await crud_credencial.delete_credencial(db, id_credencial):
        raise HTTPException(status_code=404, detail="Credencial no encontrada")
