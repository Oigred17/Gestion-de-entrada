from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import justificacion as crud_justificacion
from app.database import get_db
from app.schemas.justificacion import JustificacionCreate, JustificacionResponse, JustificacionUpdate

router = APIRouter(prefix="/justificaciones", tags=["Justificaciones"])


@router.get("/", response_model=list[JustificacionResponse])
async def listar_justificaciones(
    alumno_id: int | None = None,
    grupo_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await crud_justificacion.get_justificaciones(db, alumno_id=alumno_id, grupo_id=grupo_id)


@router.get("/{id_justificacion}", response_model=JustificacionResponse)
async def obtener_justificacion(id_justificacion: int, db: AsyncSession = Depends(get_db)):
    justificacion = await crud_justificacion.get_justificacion(db, id_justificacion)
    if not justificacion:
        raise HTTPException(status_code=404, detail="Justificacion no encontrada")
    return justificacion


@router.post("/", response_model=JustificacionResponse, status_code=201)
async def crear_justificacion(data: JustificacionCreate, db: AsyncSession = Depends(get_db)):
    return await crud_justificacion.create_justificacion(db, data)


@router.put("/{id_justificacion}", response_model=JustificacionResponse)
async def actualizar_justificacion(id_justificacion: int, data: JustificacionUpdate, db: AsyncSession = Depends(get_db)):
    justificacion = await crud_justificacion.update_justificacion(db, id_justificacion, data)
    if not justificacion:
        raise HTTPException(status_code=404, detail="Justificacion no encontrada")
    return justificacion


@router.delete("/{id_justificacion}", status_code=204)
async def eliminar_justificacion(id_justificacion: int, db: AsyncSession = Depends(get_db)):
    ok = await crud_justificacion.delete_justificacion(db, id_justificacion)
    if not ok:
        raise HTTPException(status_code=404, detail="Justificacion no encontrada")
