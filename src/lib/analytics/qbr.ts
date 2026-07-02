// ─── QBR autogenerado (Quarterly Business Review) ─────────────────────────────────
// Ensambla, para un cliente, todo lo que ya calcula el portal (contexto + analítica
// determinística + salud + hallazgos + oportunidades) en un único paquete listo
// para renderizar como reporte imprimible. La narrativa (texto ejecutivo) la añade
// la IA si está configurada; si no, el QBR se muestra igual con las métricas.

import { prisma } from "@/lib/prisma"
import { computeClientAnalytics, type ClientAnalytics } from "@/lib/analytics/aggregate"
import { computeClientHealth, type ClientHealth } from "@/lib/analytics/health"
import { getContextProvider, type ClientContext } from "@/lib/analytics/context"
import { generateQbrNarrative, type QbrNarrative } from "@/lib/analytics/ai"

export type QbrOpportunity = { name: string; tipo: string | null; impacto: string | null; estado: string }
export type QbrFinding = { titulo: string; tipo: string; recomendacion: string; impacto: string; servicio: string | null }

export type Qbr = {
  cliente: {
    id: string
    name: string
    industria: string | null
    estrategico: boolean
    objetivos: string | null
    expectativas: string | null
  }
  periodo: { desde: string | null; hasta: string | null }
  salud: ClientHealth | null
  analytics: ClientAnalytics
  oportunidades: QbrOpportunity[]
  hallazgos: QbrFinding[]
  reuniones: { total: number; ultima: string | null }
  narrativa: QbrNarrative | null
  generatedAt: string
}

// Ensambla el QBR de un cliente. `conNarrativa` controla si se llama a la IA.
export async function computeQbr(
  accountId: string,
  opts?: { conNarrativa?: boolean },
): Promise<Qbr | null> {
  const context: ClientContext | null = await getContextProvider().getContext(accountId)
  if (!context) return null

  const analytics = await computeClientAnalytics(accountId)

  // Salud solo si hay datos de tickets (evita ruido con cliente sin sincronizar).
  const salud = analytics.resumen.totalTickets > 0
    ? await computeClientHealth(accountId, analytics, context)
    : null

  const [ops, findings, meetingsCount, lastMeeting] = await Promise.all([
    prisma.opportunityRecommendation.findMany({
      where: { accountId, statecode: { in: ["Pendiente", "En proceso"] } },
      orderBy: { createdon: "desc" },
      take: 8,
    }),
    prisma.insightFinding.findMany({
      where: { accountId },
      orderBy: { generatedon: "desc" },
      take: 6,
    }),
    prisma.teamsMeetingCache.count({ where: { accountId } }),
    prisma.teamsMeetingCache.findFirst({
      where: { accountId },
      orderBy: { startAt: "desc" },
      select: { startAt: true },
    }),
  ])

  const oportunidades: QbrOpportunity[] = ops.map((o) => ({
    name: o.name,
    tipo: o.cr_bex_tipo,
    impacto: o.cr_bex_impacto,
    estado: o.statecode,
  }))
  const hallazgos: QbrFinding[] = findings.map((f) => ({
    titulo: f.titulo,
    tipo: f.tipo,
    recomendacion: f.recomendacion,
    impacto: f.impacto,
    servicio: f.servicio,
  }))

  let narrativa: QbrNarrative | null = null
  if (opts?.conNarrativa && analytics.resumen.totalTickets > 0) {
    narrativa = await generateQbrNarrative({
      cliente: { nombre: context.name, industria: context.industria, objetivos: context.objetivos, expectativas: context.expectativas },
      resumen: analytics.resumen,
      salud: salud ? { score: salud.score, color: salud.color, drivers: salud.drivers, bolsa: salud.bolsa } : null,
      porCategoria: analytics.porCategoria.slice(0, 6),
      tendenciaMensual: analytics.tendenciaMensual.slice(-6),
      oportunidades,
      hallazgos: hallazgos.map((h) => ({ titulo: h.titulo, recomendacion: h.recomendacion })),
    })
  }

  return {
    cliente: {
      id: context.id,
      name: context.name,
      industria: context.industria,
      estrategico: context.estrategico,
      objetivos: context.objetivos,
      expectativas: context.expectativas,
    },
    periodo: { desde: analytics.resumen.primerTicket, hasta: analytics.resumen.ultimoTicket },
    salud,
    analytics,
    oportunidades,
    hallazgos,
    reuniones: { total: meetingsCount, ultima: lastMeeting?.startAt?.toISOString().slice(0, 10) ?? null },
    narrativa,
    generatedAt: new Date().toISOString(),
  }
}
