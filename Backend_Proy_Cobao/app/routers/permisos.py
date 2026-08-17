import secrets
import string

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import permiso as crud_permiso
from app.crud._helpers import build_alumno_dict
from app.database import get_db
from app.models.alumno import Alumno
from app.models.grupo import Grupo
from app.schemas.permiso import (
    CodigoValidacion,
    PermisoCreate,
    PermisoResponse,
    PermisoUpdate,
)

router = APIRouter(prefix="/permisos", tags=["Permisos"])


def _generar_codigo() -> str:
    return "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))


async def _adjuntar_alumno(db: AsyncSession, permiso) -> None:
    result = await db.execute(
        select(Alumno, Grupo.clave_grupo)
        .outerjoin(Grupo, Alumno.id_grupo == Grupo.id)
        .where(Alumno.id_alumno == permiso.id_alumno)
    )
    row = result.first()
    if row:
        alumno, grupo_nombre = row
        permiso.alumno = build_alumno_dict(alumno, grupo_nombre)


@router.get("/", response_model=list[PermisoResponse])
async def listar_permisos(
    alumno_id: int | None = None,
    estado: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await crud_permiso.get_permisos(db, alumno_id=alumno_id, estado=estado)


@router.get("/{id_permiso}", response_model=PermisoResponse)
async def obtener_permiso(id_permiso: int, db: AsyncSession = Depends(get_db)):
    permiso = await crud_permiso.get_permiso(db, id_permiso)
    if not permiso:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")
    await _adjuntar_alumno(db, permiso)
    return permiso


@router.post("/", response_model=PermisoResponse, status_code=201)
async def crear_permiso(data: PermisoCreate, db: AsyncSession = Depends(get_db)):
    permiso = await crud_permiso.create_permiso(db, data)
    permiso.codigo_autorizacion = _generar_codigo()
    await db.flush()
    await _adjuntar_alumno(db, permiso)
    return permiso


@router.put("/{id_permiso}", response_model=PermisoResponse)
async def actualizar_permiso(
    id_permiso: int, data: PermisoUpdate, db: AsyncSession = Depends(get_db)
):
    permiso = await crud_permiso.update_permiso(db, id_permiso, data)
    if not permiso:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")
    await _adjuntar_alumno(db, permiso)
    return permiso


@router.delete("/{id_permiso}", status_code=204)
async def eliminar_permiso(id_permiso: int, db: AsyncSession = Depends(get_db)):
    ok = await crud_permiso.delete_permiso(db, id_permiso)
    if not ok:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")


@router.post("/validar-codigo", response_model=PermisoResponse)
async def validar_codigo_permiso(data: CodigoValidacion, db: AsyncSession = Depends(get_db)):
    """Valida un código de autorización para registrar la salida de un alumno."""
    codigo_limpio = (data.codigo or "").strip().upper()
    if not codigo_limpio:
        raise HTTPException(status_code=400, detail="Código de autorización requerido")
    permiso = await crud_permiso.get_permiso_by_codigo(db, codigo_limpio)
    if not permiso:
        raise HTTPException(status_code=404, detail="Código de autorización inválido")
    if permiso.estado not in ("Aprobado", "Utilizado"):
        raise HTTPException(
            status_code=400,
            detail=f"El permiso no está aprobado (estado: {permiso.estado})",
        )
    if await crud_permiso.expirar_si_vencido(db, permiso):
        raise HTTPException(
            status_code=400,
            detail="El permiso ya venció: pasó la hora de salida autorizada",
        )
    await _adjuntar_alumno(db, permiso)
    return permiso
