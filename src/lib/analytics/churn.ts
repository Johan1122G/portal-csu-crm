// ─── Riesgo de fuga (churn) ───────────────────────────────────────────────────────
// Puntúa el riesgo de que un cliente se vaya, combinando señales predictivas ya
// calculadas (drivers de salud: satisfacción, engagement, tendencia de tickets,
// adopción, bolsa) + proximidad de renovación. Es un modelo HEURÍSTICO EXPLICABLE
// (no entrenado): cada factor aporta y se listan los que más pesan. Un modelo
// entrenado real requiere historial de bajas (churn) que aún no existe.

import { computeClientAnalytics } from "@/lib/analytics/aggregate"
import { computeClientHealth } from "@/lib/analytics/health"
import { getContextProvider } from "@/lib/analytics/context"

// Peso de cada driver como señal de fuga (suma ~0.9; el 0.1 restante lo aporta la
// proximidad de renovación como bump).
const PESOS: Record<string, number> = {
  Satisfacción: 0.3,
  Engagement: 0.25,
  "Tendencia de tickets": 0.15,
  Adopción: 0.15,
  "Bolsa de horas": 0.05,
}

export type ChurnFactor = { factor: string; detalle: string; contribucion: number }
export type ChurnClient = {
  id: string
  name: string
  estrategico: boolean
  riesgo: number | null // 0-100 (null = sin señal suficiente)
  banda: "Alto" | "Medio" | "Bajo" | "Sin datos"
  score: number | null // salud actual (referencia)
  factores: ChurnFactor[]
}
export type Churn = {
  generatedAt: string
  totalClientes: number
  enAlto: number
  enMedio: number
  sinDatos: number
  clientes: ChurnClient[]
}

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

const banda = (r: number | null): ChurnClient["banda"] =>
  r == null ? "Sin datos" : r >= 60 ? "Alto" : r >= 35 ? "Medio" : "Bajo"

export async function computeChurn(): Promise<Churn> {
  const provider = getContextProvider()
  const clientes = await provider.listGlpiLinkedClients()

  const rows = await mapPool(clientes, 8, async ({ id }): Promise<ChurnClient | null> => {
    const ctx = await provider.getContext(id)
    if (!ctx) return null
    const analytics = await computeClientAnalytics(id)
    const health = await computeClientHealth(id, analytics, ctx)

    let acc = 0
    let peso = 0
    const factores: ChurnFactor[] = []
    for (const d of health.drivers) {
      if (d.subscore == null) continue
      const w = PESOS[d.nombre] ?? 0
      if (w === 0) continue
      const risk = (100 - d.subscore) / 100 // 0 (sano) → 1 (peor)
      acc += w * risk
      peso += w
      // Solo se listan como "factor" los que están en mal estado.
      if (d.estado === "malo") factores.push({ factor: d.nombre, detalle: d.detalle, contribucion: w * risk })
    }

    let riesgo: number | null = peso > 0 ? (acc / peso) * 100 : null

    // Bump por renovación próxima (ventana de riesgo comercial).
    const renov = health.renovaciones.length ? health.renovaciones[0].diasRestantes : null
    if (riesgo != null && renov != null && renov <= 60) {
      const bump = renov <= 30 ? 12 : 7
      riesgo = Math.min(100, riesgo + bump)
      factores.push({
        factor: "Renovación próxima",
        detalle: renov < 0 ? "Renovación vencida" : `Renueva en ${renov} días`,
        contribucion: bump / 100,
      })
    }

    factores.sort((a, b) => b.contribucion - a.contribucion)

    return {
      id,
      name: ctx.name,
      estrategico: ctx.estrategico,
      riesgo: riesgo == null ? null : Math.round(riesgo),
      banda: banda(riesgo),
      score: health.score,
      factores,
    }
  })

  const clientesArr = rows.filter((r): r is ChurnClient => r != null).sort((a, b) => {
    if (a.riesgo == null && b.riesgo == null) return 0
    if (a.riesgo == null) return 1
    if (b.riesgo == null) return -1
    return b.riesgo - a.riesgo
  })

  return {
    generatedAt: new Date().toISOString(),
    totalClientes: clientesArr.length,
    enAlto: clientesArr.filter((c) => c.banda === "Alto").length,
    enMedio: clientesArr.filter((c) => c.banda === "Medio").length,
    sinDatos: clientesArr.filter((c) => c.banda === "Sin datos").length,
    clientes: clientesArr,
  }
}
