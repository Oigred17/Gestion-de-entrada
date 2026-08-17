---
target: Dashboard (Directivo home)
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-16T02-18-20Z
slug: src-pages-dashboardpage-tsx
---
# Critique — Dashboard (Directivo home) — `src/pages/DashboardPage.tsx`

Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Data loads once, never refreshes; no "as of HH:MM" or staleness cue |
| 2 | Match System / Real World | 2 | "Reportes" stat is ambiguous; "Fuera de horario" vs "Entrada fuera de horario" contradict on the same page |
| 3 | User Control and Freedom | 3 | "Reintentar" does a full `window.location.reload()`; nothing destructive |
| 4 | Consistency and Standards | 2 | Ignores the app's own `.table`/`.widget` system; gray header vs magenta elsewhere |
| 5 | Error Prevention | 2 | **Faltas/Salidas double-count fabricates a wrong headline metric**; UTC date bucketing |
| 6 | Recognition Rather Than Recall | 3 | Group-bar % label needs recall of a denominator the visible bar doesn't show |
| 7 | Flexibility and Efficiency | 2 | No shortcuts, no date filter, no drill-down; must leave for `/reportes` |
| 8 | Aesthetic and Minimalist Design | 2 | 5 cards (one meaningless), 7-column table, same data on 3 surfaces |
| 9 | Error Recovery | 2 | Error block exists but copy is vague and gives no fallback |
| 10 | Help and Documentation | 1 | No tooltips, no stat definitions, no guidance anywhere |
| **Total** | | **21/40** | **Acceptable (52%)** |

## Design Specificity Verdict

**Category-interchangeable.** Stock admin dashboard — 5 stat cards + data table + group bar + alerts list — built in inline styles. The product's real identity (login page's Oaxaca geometric overlay, magenta→bordeaux gradient, credential-card motif in `index.css`) is absent here; the design system's own `.dashboard-grid`/`.widget` language sits unused. Missed character: the school-day narrative (morning entry peak, who's still inside, which group struggles) is reduced to disconnected percentages.

**Deterministic scan:** 2 findings, both `layout-transition` warnings at `DashboardPage.tsx:216` and `:328` (animated `width` on progress bars) — genuine but low-impact since widths are set once on load. Detector missed a duplicate at `:329` (same snippet deduped).

**Visual overlays:** Not available — no browser automation exposed in session; page requires auth + backend + PostgreSQL.

## Overall Impression

Solid bones — semantic color system (verde=presente, turquesa=retardo, magenta=falta) and mono instrument typography are genuinely well done — but the one number this page exists to deliver (**Faltas**) is computationally wrong, and the page ends on an alarms panel with nothing the director can act on. Biggest opportunity: make Faltas a **clickable list of who's absent today** instead of a red progress bar.

## What's Working

1. Coherent semantic color system across cards, badges, bars, legend (`:11-16`, `:99-103`, `:328-342`).
2. Operational mono typography for Hora and No. Control plus the live clock.
3. Real states: Loader with `role="status" aria-live`, friendly error block with Reintentar, proper empty states.

## Priority Issues

**1. [P0] Faltas is miscomputed** — `DashboardPage.tsx:85-96`
- What: `presentes` counts only students whose *last* event today is `ENTRADA`. Entered-and-exited students land in `salidas` and are never subtracted from `faltasCount` — every student who left is reported absent.
- Why it matters: red headline metric driving discipline decisions is wrong; director alarmed on false data.
- Fix: count as presente any student with an `ENTRADA` today (distinct set); `faltas = total − entrados − ausentesConPermiso`; Salidas as subset of presentes.
- Command: `/impeccable harden`

**2. [P1] No action from the alarm** — `:380-408`
- What: Grave incident cards are dead divs; Faltas/Salidas are dead numbers.
- Why: high-stakes content without an escape hatch is a trust failure.
- Fix: alert cards navigate to filtered `/incidencias`/`/reportes`; Faltas opens the computed absent list.
- Command: `/impeccable shape`

**3. [P1] Misleading semantics + redundancy**
- What: "Reportes" = cumulative `reportesData.length` rendered as % against `totalAlumnos` (`:88,103`) — meaningless. Alertas badge caps at 5 (`:150-152,351`). Same data on 3 surfaces.
- Fix: replace "Reportes" with a real daily metric; true count in badge; collapse redundant stat.
- Command: `/impeccable clarify`

**4. [P2] 7-column table with fake affordance** — `:247-305`
- What: rows highlight on hover via inline `onMouseEnter` hack but aren't clickable; registros+retardos merged without dedup; gray header diverges from magenta `.table`.
- Fix: 4-5 columns; rows link or drop hover; "No hay actividad hoy" empty row.
- Command: `/impeccable layout`

**5. [P2] A11y + copy polish**
- What: no `<h1>`; UTC date bucketing (`:78`); meta text `#85787A` fails AA; badge glyphs `✓ ⏰ → ✗` read as symbols; missing accents ("Capacitacion", "esté").
- Fix: real `<h1>`, local-date bucketing, darker meta text, remove Unicode glyphs, proofread Spanish.
- Command: `/impeccable audit`

Detector agree/contradict: both assessments flagged stale data; detector's catch (layout-thrash transitions) is low-impact alone but compounds with the 1s `setInterval` re-render (`:44-47`). No false positives.

## Persona Red Flags

**Alex (impatient power-user director):** "who's missing?" at a glance → five equally weighted cards (one lies whenever anyone exits), 7-column table that rewards hover with nothing, group chart whose % disagrees with its bar. Must leave the page for his real daily question. Data never refreshes.

**Sam (keyboard / screen-reader):** no `<h1>`; incident cards non-focusable divs; `✓ ⏰ → ✗` glyphs read aloud; `'---'` announced literally; clock invisible to SR; no skip link.

## Cognitive Load

**High** — 5+ checklist failures: no single focus (4 competing regions), 5 stat cards + 7-column table + 10-item sidebar, no progressive disclosure, working-memory trap (group bar shows presentes+retardos stacked but % counts only presentes/total).

## Minor Observations

- 1s `setInterval` re-renders the entire component every second.
- Two stat cards share the `AlertTriangle` icon (Faltas, Reportes).
- "Actividad reciente" slices registros+retardos globally, not today.
- Group bar segments scale to `maxPresentes` but `overflow:hidden` clips over-long segments.
- `'---'` and "Desconocido" as data placeholders.
- Worth keeping: `es-MX` long date, mono clock, borderless icon buttons.

## Questions to Consider

- What if the dashboard told the **story of the school day** as a timeline instead of five disconnected percentages?
- What would the director actually do on a bad day? Shouldn't Faltas be a live, clickable absent list?
- What if each stat used its own correct denominator instead of universal `totalAlumnos`?
