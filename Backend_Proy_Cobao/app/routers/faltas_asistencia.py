from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import falta_asistencia as crud_falta
from app.database import get_db
from app.schemas.falta_asistencia import FaltaAsistenciaResponse, FaltaGenerarResponse
from app.services import faltas_asistencia as service

router = APIRouter(prefix="/faltas-asistencia", tags=["Faltas de Asistencia"])


class GenerarFaltasRequest(BaseModel):
    fecha: date | None = None


@router.get("/", response_model=list[FaltaAsistenciaResponse])
async def listar_faltas(
    alumno_id: int | None = None,
    tipo: str | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
    db: AsyncSession = Depends(get_db),
):
    if tipo is not None and tipo not in ("FALTANTE", "SIN_SALIDA"):
        raise HTTPException(status_code=400, detail="tipo debe ser FALTANTE o SIN_SALIDA")
    return await crud_falta.get_faltas(
        db,
        alumno_id=alumno_id,
        tipo=tipo,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
    )


@router.post("/generar", response_model=FaltaGenerarResponse)
async def generar_faltas_dia(
    data: GenerarFaltasRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Genera (o revalida) las faltas de asistencia de una fecha.

    Por defecto usa el dia anterior. Es idempotente: no duplica faltas.
    """
    fecha = (data.fecha if data else None) or (date.today() - timedelta(days=1))
    return await service.generar_faltas(db, fecha)


@router.delete("/{id_falta}", status_code=204)
async def eliminar_falta(id_falta: int, db: AsyncSession = Depends(get_db)):
    ok = await crud_falta.delete_falta(db, id_falta)
    if not ok:
        raise HTTPException(status_code=404, detail="Falta de asistencia no encontrada")
