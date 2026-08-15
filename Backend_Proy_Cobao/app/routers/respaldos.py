"""
Respaldo de la base de datos: genera un volcado JSON de todas las tablas y
permite descargarlo o eliminarlo. No requiere herramientas externas (pg_dump).
"""

import json
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Base, get_db
from app.models.respaldo import Respaldo

router = APIRouter(prefix="/respaldos", tags=["Respaldos"])


def _serializar(valor):
    if isinstance(valor, (datetime, date)):
        return valor.isoformat()
    return valor


def _resumen(r: Respaldo) -> dict:
    return {
        "id": r.id_respaldo,
        "fecha": r.fecha.isoformat() if isinstance(r.fecha, datetime) else str(r.fecha),
        "tamano": _formatear_tamano(r.tamano_bytes),
        "tamano_bytes": r.tamano_bytes,
        "tipo": r.tipo,
        "estado": r.estado,
    }


def _formatear_tamano(bytes_: int) -> str:
    if bytes_ < 1024:
        return f"{bytes_} B"
    if bytes_ < 1024 * 1024:
        return f"{bytes_ / 1024:.1f} KB"
    return f"{bytes_ / (1024 * 1024):.2f} MB"


@router.get("/")
async def listar_respaldos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Respaldo).order_by(Respaldo.fecha.desc()).limit(30)
    )
    return [_resumen(r) for r in result.scalars().all()]


@router.post("/generar", status_code=201)
async def generar_respaldo(db: AsyncSession = Depends(get_db)):
    volcado: dict[str, list] = {}
    for tabla in Base.metadata.sorted_tables:
        filas = (await db.execute(select(tabla))).all()
        registros = []
        for fila in filas:
            datos = {}
            for key, value in fila._mapping.items():
                datos[key] = _serializar(value)
            registros.append(datos)
        volcado[tabla.name] = registros

    contenido = json.dumps(
        {
            "sistema": "COBAO NFC",
            "version": "1.0.0",
            "fecha_generacion": datetime.now().isoformat(),
            "tablas": volcado,
        },
        ensure_ascii=False,
        indent=2,
    )

    respaldo = Respaldo(
        tamano_bytes=len(contenido.encode("utf-8")),
        tipo="Manual",
        estado="Completado",
        contenido=contenido,
    )
    db.add(respaldo)
    await db.commit()
    await db.refresh(respaldo)
    return _resumen(respaldo)


@router.get("/{id_respaldo}/descargar")
async def descargar_respaldo(id_respaldo: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Respaldo).where(Respaldo.id_respaldo == id_respaldo))
    respaldo = result.scalar_one_or_none()
    if not respaldo:
        raise HTTPException(status_code=404, detail="Respaldo no encontrado")

    datos = json.loads(respaldo.contenido)
    return JSONResponse(
        content=datos,
        headers={
            "Content-Disposition": (
                f'attachment; filename="respaldo_cobao_{respaldo.id_respaldo}_{respaldo.fecha.date()}.json"'
            )
        },
    )


@router.delete("/{id_respaldo}", status_code=204)
async def eliminar_respaldo(id_respaldo: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Respaldo).where(Respaldo.id_respaldo == id_respaldo))
    respaldo = result.scalar_one_or_none()
    if not respaldo:
        raise HTTPException(status_code=404, detail="Respaldo no encontrado")
    await db.delete(respaldo)
    await db.commit()
