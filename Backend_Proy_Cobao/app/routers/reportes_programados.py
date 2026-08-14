from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import reporte_programado as crud_reporte
from app.database import get_db
from app.schemas.reporte_programado import (
    ReporteProgramadoCreate,
    ReporteProgramadoResponse,
    ReporteProgramadoUpdate,
)
from app.services import email_service
from app.services.reporte_ejecucion import generar_csv, siguiente_generacion

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
    if not data.proxima_generacion:
        data.proxima_generacion = siguiente_generacion(data.frecuencia)
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


@router.post("/{id_reporte}/ejecutar")
async def ejecutar_reporte_programado(id_reporte: int, db: AsyncSession = Depends(get_db)):
    """Ejecuta el reporte programado ahora: genera el CSV y lo envia por correo."""
    reporte = await crud_reporte.get_reporte_programado(db, id_reporte)
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte programado no encontrado")

    contenido = await generar_csv(db, reporte)

    destinatarios = [
        email.strip()
        for email in (reporte.destinatarios or "").split(",")
        if email.strip()
    ]

    enviados = []
    for email in destinatarios:
        ok = email_service.send_email(
            email,
            f"COBAO - Reporte programado: {reporte.nombre}",
            f"Reporte generado el {date.today().isoformat()}\n\n{contenido}",
        )
        enviados.append({"email": email, "enviado": ok})

    hoy = date.today()
    reporte.ultima_generacion = hoy
    reporte.proxima_generacion = siguiente_generacion(reporte.frecuencia, hoy)

    return {
        "mensaje": (
            f"Reporte generado y enviado a {len(enviados)} destinatario(s)."
            if enviados
            else "Reporte generado. No hay destinatarios configurados para el envio."
        ),
        "ultima_generacion": str(reporte.ultima_generacion),
        "proxima_generacion": str(reporte.proxima_generacion),
        "enviados": enviados,
        "lineas": len(contenido.splitlines()) - 1,
    }
