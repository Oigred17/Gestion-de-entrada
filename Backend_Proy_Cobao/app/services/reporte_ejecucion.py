"""Generacion bajo demanda de reportes programados (CSV) para envio por correo."""

from datetime import date, datetime, time, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import registro_acceso as crud_registro
from app.models.reporte_programado import ReporteProgramado

FREQUENCIAS = {
    "diario": 1,
    "semanal": 7,
    "mensual": 30,
}


async def generar_csv(db: AsyncSession, reporte: ReporteProgramado) -> str:
    """Genera un CSV con los registros de acceso del periodo del reporte."""
    hoy = date.today()
    ultima = reporte.ultima_generacion or (hoy - timedelta(days=30))
    inicio = datetime.combine(ultima, time.min)
    fin = datetime.combine(hoy, time.max)

    registros = await crud_registro.get_registros(db, fecha_inicio=inicio, fecha_fin=fin)

    lines = ["fecha_hora,alumno_id,tipo_acceso"]
    for r in registros:
        fecha_hora = r.get("fecha_hora")
        lines.append(
            f"{fecha_hora.isoformat() if fecha_hora else ''},{r.get('alumno_id') or ''},{r.get('tipo_acceso') or ''}"
        )

    return "\n".join(lines)


def siguiente_generacion(frecuencia: str, desde: date | None = None) -> date:
    """Calcula la proxima fecha de generacion segun la frecuencia."""
    base = desde or date.today()
    dias = FREQUENCIAS.get((frecuencia or "").strip().lower(), 1)
    return base + timedelta(days=dias)
