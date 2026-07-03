// ─── Proyección de capacidad ──────────────────────────────────────────────────────
// Pronostica el volumen de tickets y el consumo de horas de los próximos meses
// (para planear el equipo) y lista las bolsas de horas próximas a agotarse (para
// anticipar renovaciones). Determinístico: tendencia lineal (mínimos cuadrados)
// sobre la serie mensual agregada; sin IA.

import { addWeeks } from "date-fns"
import { prisma } from "@/lib/prisma"
import { computePortfolio } from "@/lib/analytics/portfolio"

const MESES_HISTORICOS = 6 // ventana para calcular la tendencia y mostrar
const MESES_PROYECCION = 3 // horizonte del pronóstico

export type MonthPoint = { mes: string; casos: number; horas: number; proyectado: boolean }
export type BagRisk = {
  id: string
  name: string
  bolsaPct: number | null
  semanasParaAgotar: number | null
  fechaAgote: string | null
}
export type Capacity = {
  generatedAt: string
  serie: MonthPoint[]
  proyeccion: { meses: number; tickets: number; horas: number }
  bolsas: BagRisk[]
  totalClientes: number
}

const round1 = (n: number) => Math.round(n * 10) / 10

// Pronóstico por mínimos cuadrados; devuelve `periods` valores (>=0, redondeados).
function forecast(values: number[], periods: number, decimals = 0): number[] {
  const n = values.length
  const factor = decimals ? 10 ** decimals : 1
  const r = (v: number) => Math.max(0, Math.round(v * factor) / factor)
  if (n === 0) return Array(periods).fill(0)
  if (n === 1) return Array(periods).fill(r(values[0]))
  const xs = Array.from({ length: n }, (_, i) => i)
  const sx = xs.reduce((a, b) => a + b, 0)
  const sy = values.reduce((a, b) => a + b, 0)
  const sxx = xs.reduce((a, x) => a + x * x, 0)
  const sxy = xs.reduce((a, x, i) => a + x * values[i], 0)
  const denom = n * sxx - sx * sx || 1
  const b = (n * sxy - sx * sy) / denom
  const a = (sy - b * sx) / n
  return Array.from({ length: periods }, (_, k) => r(a + b * (n + k)))
}

// "YYYY-MM" + k meses.
function addMonth(mes: string, k: number): string {
  const [y, m] = mes.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + k, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

// Rellena meses faltantes con ceros para que la tendencia no se distorsione.
function densify(rows: { mes: string; casos: number; horas: number }[]): { mes: string; casos: number; horas: number }[] {
  if (rows.length === 0) return []
  const out: { mes: string; casos: number; horas: number }[] = []
  let cursor = rows[0].mes
  const last = rows[rows.length - 1].mes
  const map = new Map(rows.map((r) => [r.mes, r]))
  // Guarda contra bucles largos (máx 60 meses).
  for (let i = 0; i < 60 && cursor <= last; i++) {
    out.push(map.get(cursor) ?? { mes: cursor, casos: 0, horas: 0 })
    cursor = addMonth(cursor, 1)
  }
  return out
}

export async function computeCapacity(): Promise<Capacity> {
  // Serie mensual agregada de TODA la base (una sola consulta).
  const raw = await prisma.$queryRaw<{ mes: string; casos: number; horas: number }[]>`
    SELECT to_char(date_trunc('month', "openedAt"), 'YYYY-MM') AS mes,
           count(*)::int AS casos,
           COALESCE(sum("actiontimeHours"), 0)::float AS horas
    FROM "glpi_ticket_facts"
    WHERE "openedAt" IS NOT NULL
    GROUP BY 1
    ORDER BY 1
  `
  const dense = densify(raw.map((r) => ({ mes: r.mes, casos: Number(r.casos), horas: round1(Number(r.horas)) })))

  // Ventana reciente para la tendencia + display.
  const hist = dense.slice(-MESES_HISTORICOS)
  const casosFc = forecast(hist.map((m) => m.casos), MESES_PROYECCION, 0)
  const horasFc = forecast(hist.map((m) => m.horas), MESES_PROYECCION, 1)

  const serie: MonthPoint[] = hist.map((m) => ({ ...m, proyectado: false }))
  const ultimoMes = hist.length ? hist[hist.length - 1].mes : null
  if (ultimoMes) {
    for (let k = 0; k < MESES_PROYECCION; k++) {
      serie.push({ mes: addMonth(ultimoMes, k + 1), casos: casosFc[k], horas: horasFc[k], proyectado: true })
    }
  }

  const proyeccion = {
    meses: MESES_PROYECCION,
    tickets: casosFc.reduce((a, b) => a + b, 0),
    horas: round1(horasFc.reduce((a, b) => a + b, 0)),
  }

  // Bolsas próximas a agotarse (reusa el cálculo de la Cartera).
  const now = new Date()
  const portfolio = await computePortfolio()
  const bolsas: BagRisk[] = portfolio
    .filter((p) => p.bolsaPct != null && p.semanasParaAgotar != null)
    .sort((a, b) => (a.semanasParaAgotar ?? 0) - (b.semanasParaAgotar ?? 0))
    .map((p) => ({
      id: p.id,
      name: p.name,
      bolsaPct: p.bolsaPct,
      semanasParaAgotar: p.semanasParaAgotar,
      fechaAgote:
        p.semanasParaAgotar != null
          ? addWeeks(now, Math.max(0, Math.round(p.semanasParaAgotar))).toISOString().slice(0, 10)
          : null,
    }))

  return {
    generatedAt: new Date().toISOString(),
    serie,
    proyeccion,
    bolsas,
    totalClientes: portfolio.length,
  }
}
