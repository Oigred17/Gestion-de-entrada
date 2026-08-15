"""Generacion automatica de faltas de asistencia.

Reglas:
- FALTANTE: alumno inscrito (ciclo activo) sin registro de ENTRADA en el dia
  y sin permiso aprobado que cubra esa fecha.
- SIN_SALIDA: alumno con ENTRADA pero sin SALIDA en el dia.
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
from app.models.falta_asistencia import FaltaAsistencia
from app.models.grupo import Grupo
from app.models.horario import Horario
from app.models.permiso import Permiso
from app.models.registro_acceso import RegistroAcceso

logger = logging.getLogger(__name__)

DIAS_NOMBRES = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"]

MOTIVO_FALTANTE = "No registro entrada (faltante)"
MOTIVO_SIN_SALIDA = "Registro entrada sin salida"

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


async def generar_faltas(db, fecha: date) -> dict:
    """Genera (o revalida) las faltas de asistencia para una fecha.

    Idempotente: no duplica faltas ya existentes.
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
    resultado["hora_cierre"] = hora_salida_para(fecha, general, horarios).strftime("%H:%M")

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
    existentes = (
        await db.execute(
            select(FaltaAsistencia.id_alumno, FaltaAsistencia.tipo).where(
                FaltaAsistencia.fecha == fecha
            )
        )
    ).all()
    ya_existentes = {
        (id_alumno, tipo) for id_alumno, tipo in existentes
    }

    nuevas: list[FaltaAsistencia] = []
    for alumno in alumnos:
        aid = alumno.id_alumno
        if aid not in entradas and aid not in permisos_set:
            if (aid, "FALTANTE") not in ya_existentes:
                nuevas.append(
                    FaltaAsistencia(
                        id_alumno=aid, fecha=fecha, tipo="FALTANTE", motivo=MOTIVO_FALTANTE
                    )
                )
        elif aid in entradas and aid not in salidas:
            if (aid, "SIN_SALIDA") not in ya_existentes:
                nuevas.append(
                    FaltaAsistencia(
                        id_alumno=aid, fecha=fecha, tipo="SIN_SALIDA", motivo=MOTIVO_SIN_SALIDA
                    )
                )

    if nuevas:
        db.add_all(nuevas)
        await db.flush()

    resultado["faltantes"] = sum(1 for f in nuevas if f.tipo == "FALTANTE")
    resultado["sin_salida"] = sum(1 for f in nuevas if f.tipo == "SIN_SALIDA")
    resultado["total"] = len(nuevas)
    resultado["ya_existentes"] = len(ya_existentes)
    resultado["mensaje"] = (
        f"Se registraron {resultado['total']} faltas "
        f"({resultado['faltantes']} faltantes, {resultado['sin_salida']} sin salida)."
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
