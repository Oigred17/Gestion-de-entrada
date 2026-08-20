/** COBAO: el año se divide en 2 semestres fijos (solo cambia el año en el nombre). */
export const SEMESTRE_LABELS: Record<'A' | 'B', string> = {
  A: 'Enero – Junio',
  B: 'Julio – Diciembre',
};

export type CicloParsed = { year: number; semestre: 'A' | 'B' };

export function parseCicloName(nombre: string): CicloParsed | null {
  const match = nombre.trim().match(/^(\d{4})\s*([ABab])$/);
  if (!match) return null;
  return { year: parseInt(match[1], 10), semestre: match[2].toUpperCase() as 'A' | 'B' };
}

/** Semestre vigente según la fecha (A: ene–jun, B: jul–dic). */
export function semestreFromDate(d: Date = new Date()): 'A' | 'B' {
  return d.getMonth() >= 6 ? 'B' : 'A'; // mes 0-index: jun=5 → A, jul=6 → B
}

/** Nombre automático del ciclo para una fecha, p. ej. 2026B. */
export function cicloNameFromDate(d: Date = new Date()): string {
  return `${d.getFullYear()}${semestreFromDate(d)}`;
}

/** Fechas de inicio/fin calculadas desde el nombre (AAAA + A|B). */
export function fechasFromCicloName(nombre: string): { inicio: string; fin: string } {
  const parsed = parseCicloName(nombre);
  if (!parsed) return { inicio: '', fin: '' };
  if (parsed.semestre === 'A') {
    return {
      inicio: `${parsed.year}-01-01`,
      fin: `${parsed.year}-06-30`,
    };
  }
  return {
    inicio: `${parsed.year}-07-01`,
    fin: `${parsed.year}-12-31`,
  };
}

export function formatCicloPeriodo(nombre: string): string {
  const parsed = parseCicloName(nombre);
  if (!parsed) return nombre;
  return `${SEMESTRE_LABELS[parsed.semestre]} ${parsed.year}`;
}

export function formatCicloLabel(nombre: string): string {
  const parsed = parseCicloName(nombre);
  if (!parsed) return nombre;
  return `${nombre.toUpperCase()} · ${formatCicloPeriodo(nombre)}`;
}

/** Genera nombres 2026B, 2026A, 2025B… (recientes primero). */
export function generarCiclosAnuales(anioDesde: number, anioHasta: number): string[] {
  const nombres: string[] = [];
  for (let y = anioHasta; y >= anioDesde; y--) {
    nombres.push(`${y}B`, `${y}A`);
  }
  return nombres;
}

/** Años a mostrar en filtros: egresados existentes + rango alrededor del año actual. */
export function rangoAniosParaFiltro(cohortes: string[], padding = 2): [number, number] {
  const years = cohortes
    .map((c) => parseCicloName(c)?.year)
    .filter((y): y is number => y != null);
  const current = new Date().getFullYear();
  const min = years.length ? Math.min(...years, current) : current - padding;
  const max = years.length ? Math.max(...years, current) : current + padding;
  return [min - padding, max + padding];
}

export function sugerirSiguienteCiclo(nombres: string[]): string {
  if (nombres.length === 0) return cicloNameFromDate();
  const sorted = [...nombres].sort();
  const ultimo = sorted[sorted.length - 1];
  const parsed = parseCicloName(ultimo);
  if (!parsed) return cicloNameFromDate();
  return parsed.semestre === 'A' ? `${parsed.year}B` : `${parsed.year + 1}A`;
}

export function validarOrdenCiclo(nombre: string, nombres: string[]): string | null {
  const parsed = parseCicloName(nombre);
  if (!parsed) return 'El nombre debe tener el formato AAAA + A o B (ej: 2026B)';
  if (nombres.length === 0) return null;
  const sorted = [...nombres].sort();
  const ultimo = sorted[sorted.length - 1];
  const ultimoParsed = parseCicloName(ultimo);
  if (!ultimoParsed) return null;
  const esperado = ultimoParsed.semestre === 'A' ? 'B' : 'A';
  const yearEsperado = ultimoParsed.semestre === 'B' ? ultimoParsed.year + 1 : ultimoParsed.year;
  if (parsed.semestre !== esperado || parsed.year !== yearEsperado) {
    return `El siguiente ciclo debe ser ${yearEsperado}${esperado}`;
  }
  return null;
}
