from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import inscripcion as crud_inscripcion
from app.database import get_db
from app.schemas.inscripcion import (
    InscripcionCreate,
    InscripcionResponse,
    InscripcionUpdate,
)

router = APIRouter(prefix="/inscripciones", tags=["Inscripciones"])


@router.get("/", response_model=list[InscripcionResponse])
async def listar_inscripciones(
    alumno_id: int | None = Query(None),
    ciclo_id: int | None = Query(None),
    grupo_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await crud_inscripcion.get_inscripciones(
        db, alumno_id=alumno_id, ciclo_id=ciclo_id, grupo_id=grupo_id
    )


@router.get("/{inscripcion_id}", response_model=InscripcionResponse)
async def obtener_inscripcion(
    inscripcion_id: int, db: AsyncSession = Depends(get_db)
):
    inscripcion = await crud_inscripcion.get_inscripcion(db, inscripcion_id)
    if not inscripcion:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    return inscripcion


@router.post("/", response_model=InscripcionResponse, status_code=201)
async def crear_inscripcion(
    data: InscripcionCreate, db: AsyncSession = Depends(get_db)
):
    return await crud_inscripcion.create_inscripcion(db, data)


@router.put("/{inscripcion_id}", response_model=InscripcionResponse)
async def actualizar_inscripcion(
    inscripcion_id: int,
    data: InscripcionUpdate,
    db: AsyncSession = Depends(get_db),
):
    inscripcion = await crud_inscripcion.update_inscripcion(db, inscripcion_id, data)
    if not inscripcion:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    return inscripcion


@router.delete("/{inscripcion_id}", status_code=204)
async def eliminar_inscripcion(
    inscripcion_id: int, db: AsyncSession = Depends(get_db)
):
    if not await crud_inscripcion.delete_inscripcion(db, inscripcion_id):
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
