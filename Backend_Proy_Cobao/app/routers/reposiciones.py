from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import reposicion as crud_reposicion
from app.database import get_db
from app.dependencies import get_current_user_from_request
from app.models.usuario import Usuario
from app.schemas.reposicion import ReposicionCreate, ReposicionResponse, ReposicionUpdate

router = APIRouter(prefix="/reposiciones", tags=["Reposiciones"])


@router.get("/", response_model=list[ReposicionResponse])
async def listar_reposiciones(
    alumno_id: int | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await crud_reposicion.get_reposiciones(
        db,
        alumno_id=alumno_id,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
    )


@router.get("/{id_reposicion}", response_model=ReposicionResponse)
async def obtener_reposicion(id_reposicion: int, db: AsyncSession = Depends(get_db)):
    reposicion = await crud_reposicion.get_reposicion(db, id_reposicion)
    if not reposicion:
        raise HTTPException(status_code=404, detail="Reposición no encontrada")
    return reposicion


@router.post("/", response_model=ReposicionResponse, status_code=201)
async def crear_reposicion(
    data: ReposicionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_from_request),
):
    if data.id_usuario_registro is None:
        data.id_usuario_registro = current_user.id_usuario
    return await crud_reposicion.create_reposicion(db, data)


@router.put("/{id_reposicion}", response_model=ReposicionResponse)
async def actualizar_reposicion(
    id_reposicion: int, data: ReposicionUpdate, db: AsyncSession = Depends(get_db)
):
    reposicion = await crud_reposicion.update_reposicion(db, id_reposicion, data)
    if not reposicion:
        raise HTTPException(status_code=404, detail="Reposición no encontrada")
    return reposicion


@router.delete("/{id_reposicion}", status_code=204)
async def eliminar_reposicion(id_reposicion: int, db: AsyncSession = Depends(get_db)):
    ok = await crud_reposicion.delete_reposicion(db, id_reposicion)
    if not ok:
        raise HTTPException(status_code=404, detail="Reposición no encontrada")
