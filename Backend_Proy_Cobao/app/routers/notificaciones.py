"""
Notificaciones del sistema.

Agrega eventos reales de la base de datos (incidencias, permisos, retardos y
credenciales por vencer) y los devuelve como notificaciones para la campana
del frontend. No incluye las entradas/salidas de alumnos y maestros.
"""

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.alumno import Alumno
from app.models.credencial import Credencial
from app.models.incidencia import Incidencia
from app.models.permiso import Permiso
from app.models.profesor import Profesor
from app.models.retardo import Retardo

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])

MAX_NOTIFICACIONES = 15


def _truncar(texto: str, limite: int = 90) -> str:
    texto = (texto or "").strip()
    return texto if len(texto) <= limite else texto[: limite - 1].rstrip() + "…"


def _nombre(nombre: str | None) -> str:
    return (nombre or "").strip() or "Persona sin nombre"


def _to_iso(valor) -> str | None:
    if valor is None:
        return None
    if isinstance(valor, datetime):
        if valor.tzinfo is None:
            valor = valor.replace(tzinfo=timezone.utc)
        return valor.isoformat()
    if isinstance(valor, date):
        return datetime.combine(valor, datetime.min.time()).replace(tzinfo=timezone.utc).isoformat()
    return str(valor)


@router.get("/")
async def obtener_notificaciones(db: AsyncSession = Depends(get_db)):
    notificaciones: list[dict] = []

    # --- Incidencias recientes ---
    result = await db.execute(
        select(
            Incidencia.id_incidencia,
            Incidencia.tipo,
            Incidencia.descripcion,
            Incidencia.estado,
            Incidencia.fecha_registro,
            Alumno.nombre_completo.label("nombre"),
        )
        .select_from(Incidencia)
        .join(Alumno, Alumno.id_alumno == Incidencia.id_alumno)
        .order_by(Incidencia.fecha_registro.desc())
        .limit(5)
    )
    for row in result.all():
        notificaciones.append({
            "id": f"inc:{row.id_incidencia}",
            "type": "warning" if row.estado == "Abierto" else "info",
            "title": f"Incidencia: {_truncar(row.tipo or 'General', 40)}",
            "text": f"{_nombre(row.nombre)} · {_truncar(row.descripcion)}",
            "time": _to_iso(row.fecha_registro),
            "unread": True,
        })

    # --- Permisos recientes ---
    result = await db.execute(
        select(
            Permiso.id_permiso,
            Permiso.motivo,
            Permiso.estado,
            Permiso.fecha_registro,
            Alumno.nombre_completo.label("nombre"),
        )
        .select_from(Permiso)
        .join(Alumno, Alumno.id_alumno == Permiso.id_alumno)
        .order_by(Permiso.fecha_registro.desc())
        .limit(5)
    )
    for row in result.all():
        estado = (row.estado or "Pendiente").strip()
        tipo = "warning" if estado.lower() == "pendiente" else "info"
        notificaciones.append({
            "id": f"perm:{row.id_permiso}",
            "type": tipo,
            "title": f"Permiso {estado}",
            "text": f"{_nombre(row.nombre)} · {_truncar(row.motivo)}",
            "time": _to_iso(row.fecha_registro),
            "unread": True,
        })

    # --- Retardos recientes ---
    result = await db.execute(
        select(
            Retardo.id_retardo,
            Retardo.fecha,
            Retardo.minutos_retardo,
            Alumno.nombre_completo.label("nombre"),
        )
        .select_from(Retardo)
        .join(Alumno, Alumno.id_alumno == Retardo.id_alumno)
        .order_by(Retardo.fecha.desc())
        .limit(5)
    )
    for row in result.all():
        notificaciones.append({
            "id": f"ret:{row.id_retardo}",
            "type": "warning",
            "title": "Retardo registrado",
            "text": f"{_nombre(row.nombre)} · {row.minutos_retardo} min tarde",
            "time": _to_iso(row.fecha),
            "unread": True,
        })

    # --- Credenciales por vencer (proximos 30 dias) ---
    hoy = date.today()
    tope = hoy + timedelta(days=30)
    result = await db.execute(
        select(
            Credencial.id_credencial,
            Credencial.fecha_vencimiento,
            func.coalesce(Alumno.nombre_completo, Profesor.nombre_completo).label("nombre"),
        )
        .select_from(Credencial)
        .outerjoin(Alumno, Alumno.id_alumno == Credencial.id_alumno)
        .outerjoin(Profesor, Profesor.id_profesor == Credencial.id_profesor)
        .where(
            Credencial.activa.is_(True),
            Credencial.fecha_vencimiento.isnot(None),
            Credencial.fecha_vencimiento.between(hoy, tope),
        )
        .order_by(Credencial.fecha_vencimiento.asc())
        .limit(5)
    )
    for row in result.all():
        notificaciones.append({
            "id": f"cred:{row.id_credencial}",
            "type": "warning",
            "title": "Credencial por vencer",
            "text": f"{_nombre(row.nombre)} · vence el {row.fecha_vencimiento}",
            "time": _to_iso(row.fecha_vencimiento),
            "unread": True,
        })

    def _fecha(n: dict):
        return n["time"] or ""

    notificaciones.sort(key=_fecha, reverse=True)
    return notificaciones[:MAX_NOTIFICACIONES]
