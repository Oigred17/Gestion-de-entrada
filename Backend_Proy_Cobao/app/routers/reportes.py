from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import reporte as crud_reporte
from app.database import get_db
from app.schemas.reporte import ReporteCreate, ReporteResponse, ReporteUpdate

router = APIRouter(prefix="/reportes", tags=["Reportes (Faltas al Reglamento)"])


@router.get("/", response_model=list[ReporteResponse])
async def listar_reportes(
    alumno_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await crud_reporte.get_reportes(db, alumno_id=alumno_id)


@router.get("/{id_reporte}", response_model=ReporteResponse)
async def obtener_reporte(id_reporte: int, db: AsyncSession = Depends(get_db)):
    reporte = await crud_reporte.get_reporte(db, id_reporte)
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return reporte


@router.post("/", response_model=ReporteResponse, status_code=201)
async def crear_reporte(data: ReporteCreate, db: AsyncSession = Depends(get_db)):
    return await crud_reporte.create_reporte(db, data)


@router.put("/{id_reporte}", response_model=ReporteResponse)
async def actualizar_reporte(id_reporte: int, data: ReporteUpdate, db: AsyncSession = Depends(get_db)):
    reporte = await crud_reporte.update_reporte(db, id_reporte, data)
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return reporte


@router.delete("/{id_reporte}", status_code=204)
async def eliminar_reporte(id_reporte: int, db: AsyncSession = Depends(get_db)):
    ok = await crud_reporte.delete_reporte(db, id_reporte)
    if not ok:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
