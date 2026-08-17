from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import registro_acceso as crud_registro
from app.database import get_db
from app.dependencies import require_registrar_acceso
from app.schemas.registro_acceso import RegistroAccesoCreate, RegistroAccesoResponse

router = APIRouter(prefix="/registros-acceso", tags=["Registros de Acceso"])


@router.get("/", response_model=list[RegistroAccesoResponse])
async def listar_registros(
    credencial_id: int | None = Query(None),
    alumno_id: int | None = Query(None),
    fecha_inicio: datetime | None = Query(None),
    fecha_fin: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await crud_registro.get_registros(
        db, credencial_id=credencial_id, alumno_id=alumno_id, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin
    )


@router.get("/{id_registro}", response_model=RegistroAccesoResponse)
async def obtener_registro(id_registro: int, db: AsyncSession = Depends(get_db)):
    registro = await crud_registro.get_registro(db, id_registro)
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return registro


@router.post(
    "/",
    response_model=RegistroAccesoResponse,
    status_code=201,
    dependencies=[Depends(require_registrar_acceso)],
)
async def registrar_acceso(
    data: RegistroAccesoCreate, db: AsyncSession = Depends(get_db)
):
    return await crud_registro.create_registro(db, data)


@router.delete("/{id_registro}", status_code=204)
async def eliminar_registro(id_registro: int, db: AsyncSession = Depends(get_db)):
    if not await crud_registro.delete_registro(db, id_registro):
        raise HTTPException(status_code=404, detail="Registro no encontrado")
