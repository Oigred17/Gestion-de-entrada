"""Calendario COBAO: el año se divide en 2 semestres fijos.

- A: enero – junio
- B: julio – diciembre

El nombre del ciclo es AAAA + A|B (ej. 2026B). Las fechas se calculan solas.
"""

from __future__ import annotations

import re
from datetime import date

_CICLO_RE = re.compile(r"^(\d{4})\s*([ABab])$")

SEMESTRE_A_MESES = "Enero – Junio"
SEMESTRE_B_MESES = "Julio – Diciembre"


def parse_ciclo_nombre(nombre: str) -> tuple[int, str] | None:
    m = _CICLO_RE.match((nombre or "").strip())
    if not m:
        return None
    return int(m.group(1)), m.group(2).upper()


def semestre_desde_fecha(fecha: date) -> str:
    return "B" if fecha.month >= 7 else "A"


def nombre_ciclo_desde_fecha(fecha: date) -> str:
    return f"{fecha.year}{semestre_desde_fecha(fecha)}"


def fechas_desde_nombre(nombre: str) -> tuple[date, date]:
    parsed = parse_ciclo_nombre(nombre)
    if not parsed:
        raise ValueError(f"Nombre de ciclo inválido: {nombre!r}. Use formato AAAA + A o B (ej. 2026B).")
    year, semestre = parsed
    if semestre == "A":
        return date(year, 1, 1), date(year, 6, 30)
    return date(year, 7, 1), date(year, 12, 31)


def periodo_desde_nombre(nombre: str) -> str:
    parsed = parse_ciclo_nombre(nombre)
    if not parsed:
        return nombre
    _, semestre = parsed
    return SEMESTRE_A_MESES if semestre == "A" else SEMESTRE_B_MESES


def generar_nombres_ciclos(anio_desde: int, anio_hasta: int) -> list[str]:
    """Lista B antes que A dentro de cada año, años recientes primero."""
    nombres: list[str] = []
    for year in range(anio_hasta, anio_desde - 1, -1):
        nombres.append(f"{year}B")
        nombres.append(f"{year}A")
    return nombres
