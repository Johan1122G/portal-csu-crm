// ─── Benchmark por cohortes ───────────────────────────────────────────────────────
// Compara cada cliente contra sus PARES (misma industria) para detectar outliers:
// mucho soporte vs el par, CSAT por debajo, SLA peor, adopción/salud bajas.
// Determinístico (sin IA). Reusa el mismo cálculo por cliente que la Cartera.

import { computeClientAnalytics } from "@/lib/analytics/aggregate"
import { computeClientHealth } from "@/lib/analytics/health"
import { getContextProvider } from "@/lib/analytics/context"

const SIN_INDUSTRIA = "Sin industria"
// Tamaño mínimo de cohorte para que la comparación con pares sea significativa.
const MIN_COHORTE = 3

export type BenchmarkClient = {
  id: string
  name: string
  estrategico: boolean
  score: number | null
  tickets: number
  horas: number
  csat: number | null
  slaPct: number
  adopcion: string | null
  flags: string[]
}

export type Cohort = {
  industria: string
  n: number
  comparable: boolean // n >= MIN_COHORTE → los flags de outlier tienen sentido
  medTickets: number
  medHoras: number
  avgCsat: number | null
  avgSla: number
  medScore: number | null
  clientes: BenchmarkClient[]
}

export type Benchmark = {
  generatedAt: string
  totalClientes: number
  totalOutliers: number
  cohortes: Cohort[]
}

const round1 = (n: number) => Math.round(n * 10) / 10

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : round1((s[mid - 1] + s[mid]) / 2)
}
function avg(nums: number[]): number | null {
  return nums.length ? round1(nums.reduce((a, b) => a + b, 0) / nums.length) : null
}

// Límite de concurrencia (igual que la Cartera, para no saturar el pool).
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

type Raw = {
  id: string
  name: string
  industria: string
  estrategico: boolean
  score: number | null
  tickets: number
  horas: number
  csat: number | null
  slaPct: number
  adopcion: string | null
}

export async function computeBenchmark(): Promise<Benchmark> {
  const provider = getContextProvider()
  const clientes = await provider.listGlpiLinkedClients()

  const raws = (
    await mapPool(clientes, 8, async ({ id }): Promise<Raw | null> => {
      const ctx = await provider.getContext(id)
      if (!ctx) return null
      const analytics = await computeClientAnalytics(id)
      const health = await computeClientHealth(id, analytics, ctx)
      return {
        id,
        name: ctx.name,
        industria: ctx.industria && ctx.industria.trim() !== "" ? ctx.industria : SIN_INDUSTRIA,
        estrategico: ctx.estrategico,
        score: health.score,
        tickets: analytics.resumen.totalTickets,
        horas: analytics.resumen.horasTotales,
        csat: analytics.resumen.csatPromedio,
        slaPct: analytics.resumen.slaIncumplidoPct,
        adopcion: ctx.nivelAdopcion,
      }
    })
  ).filter((r): r is Raw => r != null)

  // Agrupar por industria.
  const grupos = new Map<string, Raw[]>()
  for (const r of raws) {
    const list = grupos.get(r.industria) ?? []
    list.push(r)
    grupos.set(r.industria, list)
  }

  let totalOutliers = 0
  const cohortes: Cohort[] = Array.from(grupos.entries()).map(([industria, miembros]) => {
    const n = miembros.length
    const comparable = n >= MIN_COHORTE
    const medTickets = median(miembros.map((m) => m.tickets))
    const medHoras = median(miembros.map((m) => m.horas))
    const avgCsat = avg(miembros.filter((m) => m.csat != null).map((m) => m.csat as number))
    const avgSla = avg(miembros.map((m) => m.slaPct)) ?? 0
    const medScore = miembros.some((m) => m.score != null)
      ? median(miembros.filter((m) => m.score != null).map((m) => m.score as number))
      : null

    const clientes: BenchmarkClient[] = miembros
      .map((m) => {
        const flags: string[] = []
        if (comparable) {
          if (medTickets > 0 && m.tickets >= 1.5 * medTickets && m.tickets > medTickets + 2)
            flags.push("Tickets muy por encima del par")
          if (m.csat != null && avgCsat != null && m.csat < avgCsat - 0.5)
            flags.push("CSAT por debajo del par")
          if (m.slaPct > avgSla + 15) flags.push("SLA peor que el par")
          if (m.score != null && medScore != null && m.score < medScore - 15)
            flags.push("Salud por debajo del par")
        }
        // Adopción baja es señal absoluta, no relativa a la cohorte.
        if (m.adopcion && /^bajo$/i.test(m.adopcion)) flags.push("Adopción baja")
        if (flags.length) totalOutliers++
        return {
          id: m.id,
          name: m.name,
          estrategico: m.estrategico,
          score: m.score,
          tickets: m.tickets,
          horas: m.horas,
          csat: m.csat,
          slaPct: m.slaPct,
          adopcion: m.adopcion,
          flags,
        }
      })
      // Outliers primero, luego por tickets desc.
      .sort((a, b) => b.flags.length - a.flags.length || b.tickets - a.tickets)

    return { industria, n, comparable, medTickets, medHoras, avgCsat, avgSla, medScore, clientes }
  })

  // Cohortes más grandes primero; "Sin industria" al final.
  cohortes.sort((a, b) => {
    if (a.industria === SIN_INDUSTRIA) return 1
    if (b.industria === SIN_INDUSTRIA) return -1
    return b.n - a.n
  })

  return {
    generatedAt: new Date().toISOString(),
    totalClientes: raws.length,
    totalOutliers,
    cohortes,
  }
}
