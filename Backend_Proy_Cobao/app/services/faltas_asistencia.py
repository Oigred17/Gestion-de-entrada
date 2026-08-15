"""Generacion automatica de faltas de asistencia.

Reglas:
- FALTANTE: alumno activo (grupo del ciclo activo) sin registro de ENTRADA en
  el dia y sin permiso aprobado que cubra esa fecha. Se registra como
  INCIDENCIA ("Falta por inasistencia") en la ventana de Incidencias.
- SIN_SALIDA: alumno con ENTRADA pero sin SALIDA en el dia. Se registra como
  REPORTE ("Registro de entrada sin salida") en la ventana de Faltas al
  Reglamento.
"""

import asyncio
import logging
from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select

from app.database import async_session
from app.models.alumno import Alumno
from app.models.ciclo_escolar import CicloEscolar
from app.models.configuracion_general import ConfiguracionGeneral
from app.models.credencial import Credencial
from app.models.grupo import Grupo
from app.models.horario import Horario
from app.models.incidencia import Incidencia
from app.models.permiso import Permiso
from app.models.registro_acceso import RegistroAcceso
from app.models.reporte import Reporte
from app.models.rol import Rol
from app.models.usuario import Usuario

logger = logging.getLogger(__name__)

DIAS_NOMBRES = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"]

INCIDENCIA_TIPO = "Falta por inasistencia"
INCIDENCIA_DESC = "No registro entrada (faltante)"

REPORTE_MOTIVO = "Registro de entrada sin salida"
REPORTE_SANCION = "Pendiente de sancion"

HORA_SALIDA_DEFECTO = "14:00"


def _dias_habiles_set(general: ConfiguracionGeneral | None) -> set[str]:
    raw = (general.dias_habiles if general else None) or ""
    dias = {d.strip() for d in raw.split(",") if d.strip()}
    return dias or set(DIAS_NOMBRES[:5])


def es_dia_habile(fecha: date, general: ConfiguracionGeneral | None) -> bool:
    return DIAS_NOMBRES[fecha.weekday()] in _dias_habiles_set(general)


def _parse_hora(valor: str | None) -> time:
    try:
        return datetime.strptime((valor or "").strip()[:5], "%H:%M").time()
    except ValueError:
        return time(14, 0)


def hora_salida_para(fecha: date, general: ConfiguracionGeneral | None, horarios) -> time:
    """Hora de cierre del dia: horario especial para la fecha, si existe,
    sino la hora_salida general de configuracion_general."""
    if horarios:
        iso = fecha.isoformat()
        for h in horarios:
            dias = (getattr(h, "dias", None) or "").strip()
            if getattr(h, "activo", True) and dias == iso:
                return _parse_hora(getattr(h, "hora_salida", None))
    if general is not None:
        return _parse_hora(general.hora_salida)
    return time(14, 0)


def _descanso_activo(general: ConfiguracionGeneral | None, fecha: date) -> bool:
    """True si el dia no es habil segun la configuracion."""
    return not es_dia_habile(fecha, general)


async def _usuario_sistema(db) -> int:
    """Usuario que registra las incidencias automaticas (admin)."""
    result = await db.execute(select(Usuario.id_usuario).where(Usuario.username == "admin"))
    uid = result.scalar_one_or_none()
    return uid or 1


async def _usuario_prefecto(db) -> int:
    """Usuario prefecto para reportes (el trigger valida ese rol)."""
    result = await db.execute(
        select(Usuario.id_usuario)
        .join(Rol, Rol.id_rol == Usuario.id_rol)
        .where(func.lower(Rol.nombre).in_(["prefecto", "prefectura"]))
        .order_by(Usuario.id_usuario)
        .limit(1)
    )
    uid = result.scalar_one_or_none()
    return uid or 1


async def generar_faltas(db, fecha: date) -> dict:
    """Genera (o revalida) las faltas de asistencia de una fecha.

    FALTANTE -> incidencia "Falta por inasistencia"
    SIN_SALIDA -> reporte "Registro de entrada sin salida"
    Idempotente: no duplica registros ya existentes para esa fecha.
    """
    general = (
        await db.execute(select(ConfiguracionGeneral).where(ConfiguracionGeneral.id == 1))
    ).scalar_one_or_none()

    resultado = {
        "fecha": str(fecha),
        "es_dia_habile": True,
        "hora_cierre": None,
        "faltantes": 0,
        "sin_salida": 0,
        "total": 0,
        "ya_existentes": 0,
        "mensaje": "",
    }

    if _descanso_activo(general, fecha):
        resultado["es_dia_habile"] = False
        resultado["mensaje"] = "No es dia habil, no se generan faltas."
        return resultado

    horarios = (await db.execute(select(Horario))).scalars().all()
    cierre = hora_salida_para(fecha, general, horarios)
    resultado["hora_cierre"] = cierre.strftime("%H:%M")

    # Alumnos activos cuyo grupo pertenece al ciclo escolar activo.
    alumnos = (
        await db.execute(
            select(Alumno)
            .join(Grupo, Grupo.id == Alumno.id_grupo)
            .join(CicloEscolar, CicloEscolar.id == Grupo.ciclo_escolar_id)
            .where(
                Alumno.activo.is_(True),
                CicloEscolar.activo.is_(True),
            )
        )
    ).scalars().all()

    if not alumnos:
        resultado["mensaje"] = "No hay alumnos activos en el ciclo actual."
        return resultado

    # Conjuntos de actividad del dia (sin filtrar credencial activa: importa el registro).
    registros = (
        await db.execute(
            select(RegistroAcceso.tipo_evento, Credencial.id_alumno)
            .join(Credencial, Credencial.id_credencial == RegistroAcceso.id_credencial)
            .where(
                Credencial.id_alumno.isnot(None),
                func.date(RegistroAcceso.fecha_hora) == fecha,
            )
        )
    ).all()
    entradas = {a for t, a in registros if t == "ENTRADA"}
    salidas = {a for t, a in registros if t == "SALIDA"}

    # Permisos aprobados que cubren la fecha (fecha_salida ese dia).
    permisos = (
        await db.execute(
            select(Permiso.id_alumno).where(
                Permiso.estado == "Aprobado",
                func.date(Permiso.fecha_salida) == fecha,
            )
        )
    ).scalars().all()
    permisos_set = set(permisos)

    # Faltas ya registradas para esa fecha (para no duplicar).
    incidencias_existentes = (
        await db.execute(
            select(Incidencia.id_alumno).where(
                Incidencia.tipo == INCIDENCIA_TIPO,
                func.date(Incidencia.fecha_registro) == fecha,
            )
        )
    ).scalars().all()
    reportes_existentes = (
        await db.execute(
            select(Reporte.id_alumno).where(
                Reporte.motivo == REPORTE_MOTIVO,
                Reporte.fecha == fecha,
            )
        )
    ).scalars().all()
    ya_incidencias = set(incidencias_existentes)
    ya_reportes = set(reportes_existentes)
    resultado["ya_existentes"] = len(ya_incidencias) + len(ya_reportes)

    usuario_sistema = await _usuario_sistema(db)
    nuevas_incidencias: list[Incidencia] = []
    nuevos_reportes: list[Reporte] = []
    momento = datetime.combine(fecha, cierre)

    for alumno in alumnos:
        aid = alumno.id_alumno
        if aid not in entradas and aid not in permisos_set:
            if aid not in ya_incidencias:
                nuevas_incidencias.append(
                    Incidencia(
                        id_alumno=aid,
                        tipo=INCIDENCIA_TIPO,
                        descripcion=INCIDENCIA_DESC,
                        estado="Abierto",
                        notificar=False,
                        id_usuario_registro=usuario_sistema,
                        fecha_registro=momento,
                    )
                )
        elif aid in entradas and aid not in salidas:
            if aid not in ya_reportes:
                nuevos_reportes.append(
                    Reporte(
                        id_alumno=aid,
                        id_prefecto=usuario_sistema,
                        motivo=REPORTE_MOTIVO,
                        sancion=REPORTE_SANCION,
                        sancion_cumplida=False,
                        fecha=fecha,
                    )
                )

    if nuevas_incidencias:
        db.add_all(nuevas_incidencias)
    if nuevos_reportes:
        db.add_all(nuevos_reportes)
    if nuevas_incidencias or nuevos_reportes:
        await db.flush()

    resultado["faltantes"] = len(nuevas_incidencias)
    resultado["sin_salida"] = len(nuevos_reportes)
    resultado["total"] = len(nuevas_incidencias) + len(nuevos_reportes)
    resultado["mensaje"] = (
        f"Se registraron {resultado['total']} faltas "
        f"({resultado['faltantes']} faltantes como incidencias, "
        f"{resultado['sin_salida']} sin salida como faltas al reglamento)."
    )
    return resultado


async def generar_faltas_para_dia(fecha: date) -> dict:
    """Version para tareas en segundo plano: abre su propia sesion y commitea."""
    async with async_session() as db:
        try:
            resultado = await generar_faltas(db, fecha)
            await db.commit()
            return resultado
        except Exception:
            await db.rollback()
            logger.exception("Error al generar faltas de asistencia para %s", fecha)
            raise


async def run_faltas_automaticas_loop():
    """Bucle en segundo plano: cada dia (pasadas las 00:30 UTC) genera las
    faltas de asistencia del dia anterior y expira los permisos vencidos."""
    from app.crud import permiso as crud_permiso

    objetivo: date | None = None
    while True:
        try:
            ahora = datetime.now()
            ayer = date.today() - timedelta(days=1)
            if (ahora.hour, ahora.minute) >= (0, 30) and objetivo != ayer:
                try:
                    async with async_session() as db:
                        n = await crud_permiso.marcar_vencidos(db)
                        if n:
                            logger.info("Permisos vencidos automaticamente: %d", n)
                    res = await generar_faltas_para_dia(ayer)
                    logger.info("Faltas automaticas %s: %s", ayer, res["mensaje"])
                except Exception:
                    logger.exception(
                        "Fallo la generacion automatica de faltas para %s", ayer
                    )
                objetivo = ayer
        except Exception:
            logger.exception("Error en el bucle de faltas automaticas")
        await asyncio.sleep(60)
