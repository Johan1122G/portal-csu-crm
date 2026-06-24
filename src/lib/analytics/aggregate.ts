// ─── Motor de agregación determinístico (Fase 2) ────────────────────────────────
// Calcula los cruces de la tabla de hechos GLPI (GlpiTicketFact) SIN IA. Estos
// agregados exactos son los que luego alimentan a la capa de IA (Fase 3): la IA
// narra y recomienda, pero los números salen de aquí.
//
// Nota de calidad de dato: la categoría de GLPI suele venir vacía en tickets de
// cliente, así que se expone un bucket "(sin categoría)" y la completitud de
// categorización como métrica propia (categorizacionPct).

import { prisma } from "@/lib/prisma"

const SIN_CATEGORIA = "(sin categoría)"

const STATUS_LABEL: Record<number, string> = {
  1: "Nuevo",
  2: "En curso",
  3: "Planificado",
  4: "Pendiente",
  5: "Resuelto",
  6: "Cerrado",
}

export type CategoriaAgg = {
  categoria: string
  casos: number
  pct: number
  horas: number
  csatPromedio: number | null
  resolucionPromedioHoras: number | null
}
export type MesAgg = { mes: string; casos: number; horas: number }
export type EstadoAgg = { estado: string; casos: number }
export type RecurrenteAgg = { tema: string; casos: number }

export type ClientAnalytics = {
  rango: { from: string | null; to: string | null }
  ultimoSync: string | null
  resumen: {
    totalTickets: number
    abiertos: number
    cerrados: number
    horasTotales: number
    resolucionPromedioHoras: number | null
    csatPromedio: number | null
    csatRespuestas: number
    categorizacionPct: number
    slaIncumplidoPct: number
    primerTicket: string | null
    ultimoTicket: string | null
  }
  porCategoria: CategoriaAgg[]
  porEstado: EstadoAgg[]
  tendenciaMensual: MesAgg[]
  recurrentes: RecurrenteAgg[]
}

const round1 = (n: number) => Math.round(n * 10) / 10
const avg1 = (nums: number[]): number | null =>
  nums.length === 0 ? null : round1(nums.reduce((a, b) => a + b, 0) / nums.length)

// Normaliza el asunto para detectar recurrencias: quita prefijos RE/FW, números
// largos (ids de caso) y espacios extra.
function normSubject(s: string): string {
  return s
    .toLowerCase()
    .replace(/^\s*(re|rv|fw|fwd)\s*:\s*/i, "")
    .replace(/\b\d{2,}\b/g, "#")
    .replace(/\s+/g, " ")
    .trim()
}

const monthKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`

// Calcula todos los agregados de un cliente desde la tabla de hechos.
export async function computeClientAnalytics(
  accountId: string,
  from?: Date | null,
  to?: Date | null,
): Promise<ClientAnalytics> {
  const where = {
    accountId,
    ...(from || to
      ? { openedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  }

  const facts = await prisma.glpiTicketFact.findMany({
    where,
    orderBy: { openedAt: "asc" },
  })

  const lastSyncRow = await prisma.glpiTicketFact.findFirst({
    where: { accountId },
    orderBy: { syncedAt: "desc" },
    select: { syncedAt: true },
  })

  const total = facts.length
  const cerrados = facts.filter((f) => f.status >= 5).length
  const horasTotales = round1(facts.reduce((s, f) => s + (f.actiontimeHours ?? 0), 0))
  const conCategoria = facts.filter((f) => f.category != null && f.category !== "").length
  const csatVals = facts.map((f) => f.satisfaction).filter((v): v is number => v != null)
  const resVals = facts.map((f) => f.resolutionHours).filter((v): v is number => v != null)
  const fechas = facts.map((f) => f.openedAt).filter((d): d is Date => d != null)
  const incumplidos = facts.filter((f) => f.isLate).length

  // ── Por categoría ──────────────────────────────────────────────────────────
  const catMap = new Map<string, { casos: number; horas: number; csat: number[]; res: number[] }>()
  for (const f of facts) {
    const key = f.category && f.category !== "" ? f.category : SIN_CATEGORIA
    const c = catMap.get(key) ?? { casos: 0, horas: 0, csat: [], res: [] }
    c.casos++
    c.horas += f.actiontimeHours ?? 0
    if (f.satisfaction != null) c.csat.push(f.satisfaction)
    if (f.resolutionHours != null) c.res.push(f.resolutionHours)
    catMap.set(key, c)
  }
  const porCategoria: CategoriaAgg[] = Array.from(catMap.entries())
    .map(([categoria, c]) => ({
      categoria,
      casos: c.casos,
      pct: total ? Math.round((c.casos / total) * 100) : 0,
      horas: round1(c.horas),
      csatPromedio: avg1(c.csat),
      resolucionPromedioHoras: avg1(c.res),
    }))
    .sort((a, b) => b.casos - a.casos)

  // ── Por estado ─────────────────────────────────────────────────────────────
  const estMap = new Map<number, number>()
  for (const f of facts) estMap.set(f.status, (estMap.get(f.status) ?? 0) + 1)
  const porEstado: EstadoAgg[] = Array.from(estMap.entries())
    .map(([status, casos]) => ({ estado: STATUS_LABEL[status] ?? `Estado ${status}`, casos }))
    .sort((a, b) => b.casos - a.casos)

  // ── Tendencia mensual ──────────────────────────────────────────────────────
  const mesMap = new Map<string, { casos: number; horas: number }>()
  for (const f of facts) {
    if (!f.openedAt) continue
    const k = monthKey(f.openedAt)
    const m = mesMap.get(k) ?? { casos: 0, horas: 0 }
    m.casos++
    m.horas += f.actiontimeHours ?? 0
    mesMap.set(k, m)
  }
  const tendenciaMensual: MesAgg[] = Array.from(mesMap.entries())
    .map(([mes, m]) => ({ mes, casos: m.casos, horas: round1(m.horas) }))
    .sort((a, b) => (a.mes < b.mes ? -1 : 1))

  // ── Recurrentes (asuntos repetidos) ──────────────────────────────────────────
  const recMap = new Map<string, number>()
  for (const f of facts) {
    if (!f.subject) continue
    const k = normSubject(f.subject)
    if (!k) continue
    recMap.set(k, (recMap.get(k) ?? 0) + 1)
  }
  const recurrentes: RecurrenteAgg[] = Array.from(recMap.entries())
    .filter(([, casos]) => casos >= 2)
    .map(([tema, casos]) => ({ tema, casos }))
    .sort((a, b) => b.casos - a.casos)
    .slice(0, 10)

  return {
    rango: {
      from: from ? from.toISOString().slice(0, 10) : null,
      to: to ? to.toISOString().slice(0, 10) : null,
    },
    ultimoSync: lastSyncRow?.syncedAt.toISOString() ?? null,
    resumen: {
      totalTickets: total,
      abiertos: total - cerrados,
      cerrados,
      horasTotales,
      resolucionPromedioHoras: avg1(resVals),
      csatPromedio: avg1(csatVals),
      csatRespuestas: csatVals.length,
      categorizacionPct: total ? Math.round((conCategoria / total) * 100) : 0,
      slaIncumplidoPct: total ? Math.round((incumplidos / total) * 100) : 0,
      primerTicket: fechas.length ? fechas[0].toISOString().slice(0, 10) : null,
      ultimoTicket: fechas.length ? fechas[fechas.length - 1].toISOString().slice(0, 10) : null,
    },
    porCategoria,
    porEstado,
    tendenciaMensual,
    recurrentes,
  }
}
