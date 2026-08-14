from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import alumno as crud_alumno
from app.database import get_db
from app.schemas.alumno import AlumnoCreate, AlumnoResponse, AlumnoUpdate

router = APIRouter(prefix="/alumnos", tags=["Alumnos"])


@router.get("/", response_model=list[AlumnoResponse])
async def listar_alumnos(
    solo_activos: bool = Query(False, description="Filtrar solo activos"),
    search: str | None = Query(None),
    skip: int = Query(0),
    limit: int = Query(100),
    db: AsyncSession = Depends(get_db),
):
    return await crud_alumno.get_alumnos(db, solo_activos=solo_activos, search=search)


@router.get("/{id_alumno}", response_model=AlumnoResponse)
async def obtener_alumno(id_alumno: int, db: AsyncSession = Depends(get_db)):
    alumno = await crud_alumno.get_alumno(db, id_alumno)
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    return alumno


@router.get("/matricula/{matricula}", response_model=AlumnoResponse)
async def obtener_alumno_por_matricula(
    matricula: str, db: AsyncSession = Depends(get_db)
):
    alumno = await crud_alumno.get_alumno_by_matricula(db, matricula)
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    return alumno


@router.post("/", response_model=AlumnoResponse, status_code=201)
async def crear_alumno(data: AlumnoCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await crud_alumno.create_alumno(db, data)
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig)
        if "matricula_key" in msg:
            raise HTTPException(status_code=409, detail=f"Ya existe un alumno con matrícula '{data.matricula}'")
        elif "curp_key" in msg:
            raise HTTPException(status_code=409, detail=f"Ya existe un alumno con CURP '{data.curp}'")
        elif "nss_key" in msg:
            raise HTTPException(status_code=409, detail=f"Ya existe un alumno con NSS '{data.nss}'")
        raise HTTPException(status_code=409, detail="Ya existe un registro con esos datos")


@router.put("/{id_alumno}", response_model=AlumnoResponse)
async def actualizar_alumno(
    id_alumno: int, data: AlumnoUpdate, db: AsyncSession = Depends(get_db)
):
    try:
        alumno = await crud_alumno.update_alumno(db, id_alumno, data)
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig)
        if "matricula" in msg:
            raise HTTPException(status_code=409, detail="Ya existe un alumno con esa matrícula")
        if "curp" in msg:
            raise HTTPException(status_code=409, detail="Ya existe un alumno con esa CURP")
        if "nss" in msg:
            raise HTTPException(status_code=409, detail="Ya existe un alumno con ese NSS")
        if "tipo_sangre" in msg or "chk_alumnos_tipo_sangre" in msg:
            raise HTTPException(
                status_code=422,
                detail="Tipo de sangre inválido. Use A+, A-, B+, B-, AB+, AB-, O+ u O-.",
            )
        raise HTTPException(status_code=409, detail="Conflicto al actualizar el alumno")
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    return alumno


@router.delete("/{id_alumno}", status_code=204)
async def eliminar_alumno(id_alumno: int, db: AsyncSession = Depends(get_db)):
    if not await crud_alumno.delete_alumno(db, id_alumno):
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
