from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import reporte_programado as crud_reporte
from app.database import get_db
from app.schemas.reporte_programado import (
    ReporteProgramadoCreate,
    ReporteProgramadoResponse,
    ReporteProgramadoUpdate,
)

router = APIRouter(prefix="/reportes-programados", tags=["Reportes Programados"])


@router.get("/", response_model=list[ReporteProgramadoResponse])
async def listar_reportes_programados(db: AsyncSession = Depends(get_db)):
    return await crud_reporte.get_reportes_programados(db)


@router.get("/{id_reporte}", response_model=ReporteProgramadoResponse)
async def obtener_reporte_programado(id_reporte: int, db: AsyncSession = Depends(get_db)):
    reporte = await crud_reporte.get_reporte_programado(db, id_reporte)
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte programado no encontrado")
    return reporte


@router.post("/", response_model=ReporteProgramadoResponse, status_code=201)
async def crear_reporte_programado(data: ReporteProgramadoCreate, db: AsyncSession = Depends(get_db)):
    return await crud_reporte.create_reporte_programado(db, data)


@router.put("/{id_reporte}", response_model=ReporteProgramadoResponse)
async def actualizar_reporte_programado(
    id_reporte: int, data: ReporteProgramadoUpdate, db: AsyncSession = Depends(get_db)
):
    reporte = await crud_reporte.update_reporte_programado(db, id_reporte, data)
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte programado no encontrado")
    return reporte


@router.delete("/{id_reporte}", status_code=204)
async def eliminar_reporte_programado(id_reporte: int, db: AsyncSession = Depends(get_db)):
    ok = await crud_reporte.delete_reporte_programado(db, id_reporte)
    if not ok:
        raise HTTPException(status_code=404, detail="Reporte programado no encontrado")
