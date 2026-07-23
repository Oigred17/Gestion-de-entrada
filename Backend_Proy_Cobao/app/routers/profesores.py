from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import profesor as crud_profesor
from app.database import get_db
from app.schemas.profesor import ProfesorCreate, ProfesorResponse, ProfesorUpdate

router = APIRouter(prefix="/profesores", tags=["Profesores"])


@router.get("/", response_model=list[ProfesorResponse])
async def listar_profesores(
    solo_activos: bool = Query(False, description="Filtrar solo activos"),
    db: AsyncSession = Depends(get_db),
):
    return await crud_profesor.get_profesores(db, solo_activos=solo_activos)


@router.get("/{id_profesor}", response_model=ProfesorResponse)
async def obtener_profesor(id_profesor: int, db: AsyncSession = Depends(get_db)):
    profesor = await crud_profesor.get_profesor(db, id_profesor)
    if not profesor:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")
    return profesor


@router.post("/", response_model=ProfesorResponse, status_code=201)
async def crear_profesor(data: ProfesorCreate, db: AsyncSession = Depends(get_db)):
    return await crud_profesor.create_profesor(db, data)


@router.put("/{id_profesor}", response_model=ProfesorResponse)
async def actualizar_profesor(
    id_profesor: int, data: ProfesorUpdate, db: AsyncSession = Depends(get_db)
):
    profesor = await crud_profesor.update_profesor(db, id_profesor, data)
    if not profesor:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")
    return profesor


@router.delete("/{id_profesor}", status_code=204)
async def eliminar_profesor(id_profesor: int, db: AsyncSession = Depends(get_db)):
    if not await crud_profesor.delete_profesor(db, id_profesor):
        raise HTTPException(status_code=404, detail="Profesor no encontrado")
