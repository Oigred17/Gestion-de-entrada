from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import retardo as crud_retardo
from app.database import get_db
from app.schemas.retardo import RetardoCreate, RetardoResponse, RetardoUpdate

router = APIRouter(prefix="/retardos", tags=["Retardos"])


@router.get("/", response_model=list[RetardoResponse])
async def listar_retardos(
    alumno_id: int | None = Query(None, description="Filtrar por alumno"),
    fecha_inicio: str | None = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    fecha_fin: str | None = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date as _date

    fi = _date.fromisoformat(fecha_inicio) if fecha_inicio else None
    ff = _date.fromisoformat(fecha_fin) if fecha_fin else None
    return await crud_retardo.get_retardos(db, alumno_id=alumno_id, fecha_inicio=fi, fecha_fin=ff)


@router.get("/{id_retardo}", response_model=RetardoResponse)
async def obtener_retardo(id_retardo: int, db: AsyncSession = Depends(get_db)):
    retardo = await crud_retardo.get_retardo(db, id_retardo)
    if not retardo:
        raise HTTPException(status_code=404, detail="Retardo no encontrado")
    return retardo


@router.post("/", response_model=RetardoResponse, status_code=201)
async def crear_retardo(data: RetardoCreate, db: AsyncSession = Depends(get_db)):
    return await crud_retardo.create_retardo(db, data)


@router.put("/{id_retardo}", response_model=RetardoResponse)
async def actualizar_retardo(
    id_retardo: int, data: RetardoUpdate, db: AsyncSession = Depends(get_db)
):
    retardo = await crud_retardo.update_retardo(db, id_retardo, data)
    if not retardo:
        raise HTTPException(status_code=404, detail="Retardo no encontrado")
    return retardo


@router.delete("/{id_retardo}", status_code=204)
async def eliminar_retardo(id_retardo: int, db: AsyncSession = Depends(get_db)):
    if not await crud_retardo.delete_retardo(db, id_retardo):
        raise HTTPException(status_code=404, detail="Retardo no encontrado")
