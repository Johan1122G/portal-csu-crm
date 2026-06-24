// ─── Cartera (Fase 4B) ───────────────────────────────────────────────────────────
// Calcula la salud de TODOS los clientes vinculados a GLPI para el triage del CSM:
// ranking por salud/riesgo, renovaciones próximas y bolsas por agotarse.
// Reusa el mismo motor de salud por cliente (consistencia con la vista 360°).

import { computeClientAnalytics } from "@/lib/analytics/aggregate"
import { computeClientHealth } from "@/lib/analytics/health"
import { getContextProvider } from "@/lib/analytics/context"

export type PortfolioRow = {
  id: string
  name: string
  estado: string | null
  estrategico: boolean
  score: number
  color: "verde" | "amarillo" | "rojo"
  topRiesgo: string | null
  bolsaPct: number | null
  semanasParaAgotar: number | null
  proximaRenovacionDias: number | null
  diasSinContacto: number | null
  totalTickets: number
  sincronizado: boolean
}

// Ejecuta tareas con límite de concurrencia (evita saturar el pool de conexiones).
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

export async function computePortfolio(): Promise<PortfolioRow[]> {
  const provider = getContextProvider()
  const clientes = await provider.listGlpiLinkedClients()

  const rows = await mapPool(clientes, 8, async ({ id }): Promise<PortfolioRow | null> => {
    const ctx = await provider.getContext(id)
    if (!ctx) return null
    const analytics = await computeClientAnalytics(id)
    const health = await computeClientHealth(id, analytics, ctx)

    // Riesgo principal: el driver con peor subscore (si no es bueno).
    const conDato = health.drivers.filter((d) => d.subscore != null)
    const peor = conDato.sort((a, b) => (a.subscore! - b.subscore!))[0]
    const topRiesgo = peor && peor.estado !== "bueno" ? `${peor.nombre}: ${peor.detalle}` : null

    return {
      id,
      name: ctx.name,
      estado: ctx.estado,
      estrategico: ctx.estrategico,
      score: health.score,
      color: health.color,
      topRiesgo,
      bolsaPct: health.bolsa.pct,
      semanasParaAgotar: health.bolsa.semanasParaAgotar,
      proximaRenovacionDias: health.renovaciones.length ? health.renovaciones[0].diasRestantes : null,
      diasSinContacto: health.engagement.diasSinContacto,
      totalTickets: analytics.resumen.totalTickets,
      sincronizado: analytics.ultimoSync != null,
    }
  })

  // Peor salud primero (triage).
  return rows.filter((r): r is PortfolioRow => r != null).sort((a, b) => a.score - b.score)
}
