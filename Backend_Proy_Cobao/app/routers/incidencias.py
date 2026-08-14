from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import incidencia as crud_incidencia
from app.crud._helpers import build_alumno_dict
from app.database import get_db
from app.models.alumno import Alumno
from app.models.grupo import Grupo
from app.schemas.incidencia import IncidenciaCreate, IncidenciaResponse, IncidenciaUpdate

router = APIRouter(prefix="/incidencias", tags=["Incidencias"])


async def _adjuntar_alumno(db: AsyncSession, incidencia) -> None:
    result = await db.execute(
        select(Alumno, Grupo.clave_grupo)
        .outerjoin(Grupo, Alumno.id_grupo == Grupo.id)
        .where(Alumno.id_alumno == incidencia.id_alumno)
    )
    row = result.first()
    if row:
        alumno, grupo_nombre = row
        incidencia.alumno = build_alumno_dict(alumno, grupo_nombre)


@router.get("/", response_model=list[IncidenciaResponse])
async def listar_incidencias(
    alumno_id: int | None = None,
    estado: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await crud_incidencia.get_incidencias(db, alumno_id=alumno_id, estado=estado)


@router.get("/{id_incidencia}", response_model=IncidenciaResponse)
async def obtener_incidencia(id_incidencia: int, db: AsyncSession = Depends(get_db)):
    incidencia = await crud_incidencia.get_incidencia(db, id_incidencia)
    if not incidencia:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    await _adjuntar_alumno(db, incidencia)
    return incidencia


@router.post("/", response_model=IncidenciaResponse, status_code=201)
async def crear_incidencia(data: IncidenciaCreate, db: AsyncSession = Depends(get_db)):
    incidencia = await crud_incidencia.create_incidencia(db, data)
    await _adjuntar_alumno(db, incidencia)
    return incidencia


@router.put("/{id_incidencia}", response_model=IncidenciaResponse)
async def actualizar_incidencia(
    id_incidencia: int, data: IncidenciaUpdate, db: AsyncSession = Depends(get_db)
):
    incidencia = await crud_incidencia.update_incidencia(db, id_incidencia, data)
    if not incidencia:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    await _adjuntar_alumno(db, incidencia)
    return incidencia


@router.delete("/{id_incidencia}", status_code=204)
async def eliminar_incidencia(id_incidencia: int, db: AsyncSession = Depends(get_db)):
    ok = await crud_incidencia.delete_incidencia(db, id_incidencia)
    if not ok:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
