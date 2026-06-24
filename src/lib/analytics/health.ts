// ─── Motor de salud del cliente (Fase 4A) ───────────────────────────────────────
// Compone señales en un Customer Health Score (0-100 + color) con sus drivers, y
// calcula los módulos que el CSM necesita: proyección de bolsa de horas, SLA,
// cadencia de engagement y renovaciones próximas. Todo determinístico (sin IA).

import { prisma } from "@/lib/prisma"
import type { ClientAnalytics } from "@/lib/analytics/aggregate"
import type { ClientContext } from "@/lib/analytics/context"

export type HealthDriver = { nombre: string; estado: "bueno" | "neutral" | "malo"; detalle: string; subscore: number | null }

export type ClientHealth = {
  score: number
  color: "verde" | "amarillo" | "rojo"
  drivers: HealthDriver[]
  bolsa: {
    contratadas: number | null
    consumidas: number | null
    pct: number | null
    burnRateMensual: number | null
    semanasParaAgotar: number | null
  }
  sla: { incumplidoPct: number; resolucionPromedioHoras: number | null }
  engagement: {
    ultimaInteraccion: string | null
    diasSinContacto: number | null
    proximaReunion: string | null
    frecuenciaPactada: string | null
  }
  renovaciones: { producto: string; vence: string; diasRestantes: number; estado: string }[]
}

const round1 = (n: number) => Math.round(n * 10) / 10
const DAY = 86_400_000

// Subscore 0-100 del nivel de adopción.
function adopcionSub(nivel: string | null): number | null {
  if (!nivel) return null
  const m: Record<string, number> = { óptimo: 100, optimo: 100, alto: 80, medio: 50, bajo: 20 }
  return m[nivel.toLowerCase()] ?? null
}

// Tendencia de tickets: suma de los últimos 3 meses vs los 3 previos.
function tendenciaSub(analytics: ClientAnalytics): { sub: number | null; detalle: string } {
  const t = analytics.tendenciaMensual
  if (t.length < 2) return { sub: null, detalle: "Datos insuficientes" }
  const last3 = t.slice(-3).reduce((s, m) => s + m.casos, 0)
  const prev3 = t.slice(-6, -3).reduce((s, m) => s + m.casos, 0)
  if (prev3 === 0) return { sub: last3 > 0 ? 60 : 100, detalle: `${last3} casos recientes` }
  const ratio = last3 / prev3
  if (ratio >= 1.5) return { sub: 25, detalle: `Tickets ↑ ${Math.round((ratio - 1) * 100)}% (${prev3}→${last3})` }
  if (ratio >= 1.15) return { sub: 55, detalle: `Tickets al alza (${prev3}→${last3})` }
  if (ratio <= 0.8) return { sub: 100, detalle: `Tickets a la baja (${prev3}→${last3})` }
  return { sub: 85, detalle: `Estable (${prev3}→${last3})` }
}

function csatSub(analytics: ClientAnalytics, context: ClientContext): { sub: number | null; detalle: string } {
  if (analytics.resumen.csatPromedio != null)
    return { sub: (analytics.resumen.csatPromedio / 5) * 100, detalle: `CSAT ${analytics.resumen.csatPromedio}/5 (GLPI)` }
  if (context.nivelSatisfaccion != null)
    return { sub: (context.nivelSatisfaccion / 10) * 100, detalle: `Satisfacción ${context.nivelSatisfaccion}/10 (CRM)` }
  return { sub: null, detalle: "Sin datos de satisfacción" }
}

function bolsaSub(pct: number | null): number | null {
  if (pct == null) return null
  if (pct >= 100) return 10
  if (pct >= 90) return 30
  if (pct >= 70) return 60
  return 100
}

function engagementSub(dias: number | null): number | null {
  if (dias == null) return null
  if (dias <= 30) return 100
  if (dias <= 60) return 60
  if (dias <= 90) return 35
  return 15
}

const estadoFromSub = (s: number | null): "bueno" | "neutral" | "malo" =>
  s == null ? "neutral" : s >= 70 ? "bueno" : s >= 45 ? "neutral" : "malo"

// Calcula el bundle de salud del cliente combinando agregados + contexto + datos
// de relacionamiento/gestiones/contratos.
export async function computeClientHealth(
  accountId: string,
  analytics: ClientAnalytics,
  context: ClientContext,
): Promise<ClientHealth> {
  const now = new Date()

  const [ultimaGestion, relaciones, productos] = await Promise.all([
    prisma.cSActivity.findFirst({
      where: { accountId },
      orderBy: { scheduledstart: "desc" },
      select: { scheduledstart: true },
    }),
    prisma.bextRelationship.findMany({
      where: { accountId },
      select: { cr_bex_ultimareunion: true, cr_bex_proximareunion: true, cr_bex_frecuenciacontacto: true },
    }),
    prisma.productService.findMany({
      where: { accountId, expireson: { not: null } },
      select: { title: true, cr_bex_productoservicio: true, expireson: true, statecode: true },
    }),
  ])

  // ── Engagement ───────────────────────────────────────────────────────────────
  const interacciones: Date[] = []
  if (ultimaGestion?.scheduledstart) interacciones.push(ultimaGestion.scheduledstart)
  for (const r of relaciones) if (r.cr_bex_ultimareunion) interacciones.push(r.cr_bex_ultimareunion)
  const ultimaInteraccion = interacciones.length
    ? new Date(Math.max(...interacciones.map((d) => d.getTime())))
    : null
  const diasSinContacto = ultimaInteraccion
    ? Math.floor((now.getTime() - ultimaInteraccion.getTime()) / DAY)
    : null
  const proximas = relaciones
    .map((r) => r.cr_bex_proximareunion)
    .filter((d): d is Date => d != null && d >= now)
    .sort((a, b) => a.getTime() - b.getTime())
  const frecuencia = relaciones.find((r) => r.cr_bex_frecuenciacontacto)?.cr_bex_frecuenciacontacto ?? null

  // ── Bolsa de horas + proyección ───────────────────────────────────────────────
  const contratadas = context.horasContratadas
  const consumidas = context.horasConsumidas
  const pctBolsa =
    contratadas && contratadas > 0 && consumidas != null
      ? Math.round((consumidas / contratadas) * 100)
      : null
  const ult3 = analytics.tendenciaMensual.slice(-3)
  const burnRateMensual = ult3.length ? round1(ult3.reduce((s, m) => s + m.horas, 0) / ult3.length) : null
  let semanasParaAgotar: number | null = null
  if (contratadas != null && consumidas != null && burnRateMensual && burnRateMensual > 0) {
    const restante = contratadas - consumidas
    semanasParaAgotar = restante > 0 ? round1(restante / (burnRateMensual / 4.33)) : 0
  }

  // ── Renovaciones (vencen entre −30 y +120 días) ──────────────────────────────
  const renovaciones = productos
    .map((p) => {
      const vence = p.expireson!
      const dias = Math.round((vence.getTime() - now.getTime()) / DAY)
      return {
        producto: p.cr_bex_productoservicio || p.title,
        vence: vence.toISOString().slice(0, 10),
        diasRestantes: dias,
        estado: p.statecode,
      }
    })
    .filter((r) => r.diasRestantes >= -30 && r.diasRestantes <= 120)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)

  // ── Drivers del score ──────────────────────────────────────────────────────────
  const csat = csatSub(analytics, context)
  const tend = tendenciaSub(analytics)
  const bolsaS = bolsaSub(pctBolsa)
  const adop = adopcionSub(context.nivelAdopcion)
  const engS = engagementSub(diasSinContacto)

  const drivers: HealthDriver[] = [
    { nombre: "Satisfacción", subscore: csat.sub, estado: estadoFromSub(csat.sub), detalle: csat.detalle },
    { nombre: "Tendencia de tickets", subscore: tend.sub, estado: estadoFromSub(tend.sub), detalle: tend.detalle },
    {
      nombre: "Bolsa de horas",
      subscore: bolsaS,
      estado: estadoFromSub(bolsaS),
      detalle: pctBolsa != null ? `${pctBolsa}% consumida` : "Sin bolsa registrada",
    },
    {
      nombre: "Adopción",
      subscore: adop,
      estado: estadoFromSub(adop),
      detalle: context.nivelAdopcion ?? "Sin registrar",
    },
    {
      nombre: "Engagement",
      subscore: engS,
      estado: estadoFromSub(engS),
      detalle: diasSinContacto != null ? `${diasSinContacto} días sin contacto` : "Sin interacciones registradas",
    },
  ]

  // ── Score ponderado (renormaliza sobre los drivers con dato) ────────────────────
  const PESOS: Record<string, number> = {
    Satisfacción: 0.3,
    "Tendencia de tickets": 0.2,
    "Bolsa de horas": 0.15,
    Adopción: 0.15,
    Engagement: 0.2,
  }
  let acc = 0
  let pesoTotal = 0
  for (const d of drivers) {
    if (d.subscore == null) continue
    const w = PESOS[d.nombre] ?? 0
    acc += d.subscore * w
    pesoTotal += w
  }
  const score = pesoTotal > 0 ? Math.round(acc / pesoTotal) : 0
  const color: ClientHealth["color"] = score >= 70 ? "verde" : score >= 40 ? "amarillo" : "rojo"

  return {
    score,
    color,
    drivers,
    bolsa: { contratadas, consumidas, pct: pctBolsa, burnRateMensual, semanasParaAgotar },
    sla: {
      incumplidoPct: analytics.resumen.slaIncumplidoPct,
      resolucionPromedioHoras: analytics.resumen.resolucionPromedioHoras,
    },
    engagement: {
      ultimaInteraccion: ultimaInteraccion ? ultimaInteraccion.toISOString().slice(0, 10) : null,
      diasSinContacto,
      proximaReunion: proximas.length ? proximas[0].toISOString().slice(0, 10) : null,
      frecuenciaPactada: frecuencia,
    },
    renovaciones,
  }
}
