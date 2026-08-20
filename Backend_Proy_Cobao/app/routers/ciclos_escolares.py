from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import ciclo_escolar as crud_ciclo
from app.database import get_db
from app.schemas.ciclo_escolar import (
    CicloEscolarCreate,
    CicloEscolarResponse,
    CicloEscolarUpdate,
)
from app.services.ciclo_transicion import ejecutar_transicion

router = APIRouter(prefix="/ciclos-escolares", tags=["Ciclos Escolares"])


class TransicionRequest(BaseModel):
    ciclo_nuevo_id: int


class TransicionResponse(BaseModel):
    ciclo_anterior_id: int
    ciclo_nuevo_id: int
    grupos_creados: int
    inscripciones_creadas: int
    alumnos_migrados: int
    credenciales_desactivadas: int
    alumnos_graduados: int
    grupos_nuevos: list[dict]
    alumnos_graduados_detalle: list[dict]


@router.get("/", response_model=list[CicloEscolarResponse])
async def listar_ciclos(db: AsyncSession = Depends(get_db)):
    return await crud_ciclo.get_ciclos(db)


@router.get("/activo", response_model=CicloEscolarResponse)
async def obtener_ciclo_activo(db: AsyncSession = Depends(get_db)):
    ciclo = await crud_ciclo.get_ciclo_activo(db)
    if not ciclo:
        raise HTTPException(status_code=404, detail="No hay ciclo activo")
    return ciclo


@router.post("/sincronizar", response_model=CicloEscolarResponse)
async def sincronizar_ciclo_activo(db: AsyncSession = Depends(get_db)):
    """Actualiza qué ciclo está activo según la fecha actual (hoy).
    Activa el cuyo rango contenga hoy, desactiva los demás.
    """
    ciclo = await crud_ciclo.sincronizar_activo(db)
    await db.commit()
    if not ciclo:
        raise HTTPException(
            status_code=404,
            detail="Ningún ciclo escolar contiene la fecha de hoy.",
        )
    return ciclo


@router.post("/", response_model=CicloEscolarResponse, status_code=201)
async def crear_ciclo(data: CicloEscolarCreate, db: AsyncSession = Depends(get_db)):
    from app.services.ciclos_calendario import fechas_desde_nombre

    nombre = data.nombre.strip().upper()
    fecha_inicio, fecha_fin = fechas_desde_nombre(nombre)
    overlap = await crud_ciclo.check_overlap(db, fecha_inicio, fecha_fin)
    if overlap:
        raise HTTPException(
            status_code=400,
            detail=f"Las fechas se solapan con el ciclo '{overlap.nombre}' "
                   f"({overlap.fecha_inicio} — {overlap.fecha_fin}).",
        )
    data.nombre = nombre
    data.fecha_inicio = fecha_inicio
    data.fecha_fin = fecha_fin
    ciclo = await crud_ciclo.create_ciclo(db, data)
    await db.commit()
    return ciclo


@router.post("/activar", response_model=TransicionResponse)
async def activar_ciclo_con_transicion(
    data: TransicionRequest, db: AsyncSession = Depends(get_db)
):
    try:
        resultado = await ejecutar_transicion(db, data.ciclo_nuevo_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=500, detail="Error al ejecutar la transición de ciclo."
        )
    return TransicionResponse(
        ciclo_anterior_id=resultado.ciclo_anterior_id,
        ciclo_nuevo_id=resultado.ciclo_nuevo_id,
        grupos_creados=resultado.grupos_creados,
        inscripciones_creadas=resultado.inscripciones_creadas,
        alumnos_migrados=resultado.alumnos_migrados,
        credenciales_desactivadas=resultado.credenciales_desactivadas,
        alumnos_graduados=resultado.alumnos_graduados,
        grupos_nuevos=resultado.grupos_nuevos,
        alumnos_graduados_detalle=resultado.alumnos_graduados_detalle,
    )


@router.get("/{ciclo_id}", response_model=CicloEscolarResponse)
async def obtener_ciclo(ciclo_id: int, db: AsyncSession = Depends(get_db)):
    ciclo = await crud_ciclo.get_ciclo(db, ciclo_id)
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
    return ciclo


@router.put("/{ciclo_id}", response_model=CicloEscolarResponse)
async def actualizar_ciclo(
    ciclo_id: int, data: CicloEscolarUpdate, db: AsyncSession = Depends(get_db)
):
    if data.fecha_inicio and data.fecha_fin:
        overlap = await crud_ciclo.check_overlap(
            db, data.fecha_inicio, data.fecha_fin, exclude_id=ciclo_id,
        )
        if overlap:
            raise HTTPException(
                status_code=400,
                detail=f"Las fechas se solapan con el ciclo '{overlap.nombre}' "
                       f"({overlap.fecha_inicio} — {overlap.fecha_fin}).",
            )
    ciclo = await crud_ciclo.update_ciclo(db, ciclo_id, data)
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
    return ciclo


@router.delete("/{ciclo_id}", status_code=204)
async def eliminar_ciclo(ciclo_id: int, db: AsyncSession = Depends(get_db)):
    if not await crud_ciclo.delete_ciclo(db, ciclo_id):
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
