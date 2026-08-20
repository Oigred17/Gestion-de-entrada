"""Genera faltas al reglamento cuando se acumulan 3 incidencias del mismo tipo."""

from datetime import date

from sqlalchemy import func, select

from app.models.incidencia import Incidencia
from app.models.reporte import Reporte
from app.models.rol import Rol
from app.models.usuario import Usuario

TIPOS_UMBRAL: dict[str, str] = {
    "Falta por inasistencia": "Acumulación de 3 faltas por inasistencia",
    "Acceso sin credencial": "Acumulación de 3 accesos sin credencial",
}


async def _usuario_prefecto(db) -> int:
    result = await db.execute(
        select(Usuario.id_usuario)
        .join(Rol, Rol.id_rol == Usuario.id_rol)
        .where(func.lower(Rol.nombre).in_(["prefecto", "prefectura"]))
        .order_by(Usuario.id_usuario)
        .limit(1)
    )
    uid = result.scalar_one_or_none()
    return uid or 1


async def verificar_umbral_reglamento(db, id_alumno: int, tipo: str) -> Reporte | None:
    """Si el alumno acumula 3, 6, 9… incidencias del tipo, crea una falta al reglamento."""
    motivo = TIPOS_UMBRAL.get(tipo)
    if not motivo:
        return None

    total = (
        await db.execute(
            select(func.count())
            .select_from(Incidencia)
            .where(Incidencia.id_alumno == id_alumno, Incidencia.tipo == tipo)
        )
    ).scalar() or 0

    expected = total // 3
    if expected == 0:
        return None

    existing = (
        await db.execute(
            select(func.count())
            .select_from(Reporte)
            .where(Reporte.id_alumno == id_alumno, Reporte.motivo == motivo)
        )
    ).scalar() or 0

    if existing >= expected:
        return None

    reporte = Reporte(
        id_alumno=id_alumno,
        id_prefecto=await _usuario_prefecto(db),
        motivo=motivo,
        sancion="Pendiente de sanción",
        sancion_cumplida=False,
        fecha=date.today(),
    )
    db.add(reporte)
    await db.flush()
    return reporte
