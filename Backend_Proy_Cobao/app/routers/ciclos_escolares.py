from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import ciclo_escolar as crud_ciclo
from app.database import get_db
from app.schemas.ciclo_escolar import (
    CicloEscolarCreate,
    CicloEscolarResponse,
    CicloEscolarUpdate,
)

router = APIRouter(prefix="/ciclos-escolares", tags=["Ciclos Escolares"])


@router.get("/", response_model=list[CicloEscolarResponse])
async def listar_ciclos(db: AsyncSession = Depends(get_db)):
    return await crud_ciclo.get_ciclos(db)


@router.get("/activo", response_model=CicloEscolarResponse)
async def obtener_ciclo_activo(db: AsyncSession = Depends(get_db)):
    ciclo = await crud_ciclo.get_ciclo_activo(db)
    if not ciclo:
        raise HTTPException(status_code=404, detail="No hay ciclo activo")
    return ciclo


@router.get("/{ciclo_id}", response_model=CicloEscolarResponse)
async def obtener_ciclo(ciclo_id: int, db: AsyncSession = Depends(get_db)):
    ciclo = await crud_ciclo.get_ciclo(db, ciclo_id)
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
    return ciclo


@router.post("/", response_model=CicloEscolarResponse, status_code=201)
async def crear_ciclo(data: CicloEscolarCreate, db: AsyncSession = Depends(get_db)):
    return await crud_ciclo.create_ciclo(db, data)


@router.put("/{ciclo_id}", response_model=CicloEscolarResponse)
async def actualizar_ciclo(
    ciclo_id: int, data: CicloEscolarUpdate, db: AsyncSession = Depends(get_db)
):
    ciclo = await crud_ciclo.update_ciclo(db, ciclo_id, data)
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
    return ciclo


@router.delete("/{ciclo_id}", status_code=204)
async def eliminar_ciclo(ciclo_id: int, db: AsyncSession = Depends(get_db)):
    if not await crud_ciclo.delete_ciclo(db, ciclo_id):
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
