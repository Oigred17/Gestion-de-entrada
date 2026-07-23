from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import grupo as crud_grupo
from app.database import get_db
from app.schemas.grupo import GrupoCreate, GrupoResponse, GrupoUpdate

router = APIRouter(prefix="/grupos", tags=["Grupos"])


@router.get("/", response_model=list[GrupoResponse])
async def listar_grupos(
    ciclo_id: int | None = Query(None, description="Filtrar por ciclo escolar"),
    db: AsyncSession = Depends(get_db),
):
    return await crud_grupo.get_grupos(db, ciclo_id=ciclo_id)


@router.get("/{grupo_id}", response_model=GrupoResponse)
async def obtener_grupo(grupo_id: int, db: AsyncSession = Depends(get_db)):
    grupo = await crud_grupo.get_grupo(db, grupo_id)
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    return grupo


@router.post("/", response_model=GrupoResponse, status_code=201)
async def crear_grupo(data: GrupoCreate, db: AsyncSession = Depends(get_db)):
    return await crud_grupo.create_grupo(db, data)


@router.put("/{grupo_id}", response_model=GrupoResponse)
async def actualizar_grupo(
    grupo_id: int, data: GrupoUpdate, db: AsyncSession = Depends(get_db)
):
    grupo = await crud_grupo.update_grupo(db, grupo_id, data)
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    return grupo


@router.delete("/{grupo_id}", status_code=204)
async def eliminar_grupo(grupo_id: int, db: AsyncSession = Depends(get_db)):
    if not await crud_grupo.delete_grupo(db, grupo_id):
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
