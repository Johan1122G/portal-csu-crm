// ─── Digest diario del CSM ────────────────────────────────────────────────────────
// Resume la cartera en los cubos que exigen acción HOY: clientes en rojo,
// renovaciones inminentes, bolsas por agotarse y clientes sin contacto reciente.
// Reusa computePortfolio() (mismo motor de salud) — nada se recalcula aquí.
// Opcionalmente añade una intro narrativa con IA (si Azure OpenAI está configurado).

import { computePortfolio, type PortfolioRow } from "@/lib/analytics/portfolio"
import { computeDeliverables } from "@/lib/deliverables/overview"
import { generateDigestIntro } from "@/lib/analytics/ai"

// Umbrales (ajustables): qué se considera "urgente" en cada cubo.
const RENOVACION_DIAS = 30
const BOLSA_SEMANAS = 6
const SIN_CONTACTO_DIAS = 60

export type DigestRow = {
  id: string
  name: string
  estrategico: boolean
  score: number | null
  color: PortfolioRow["color"]
  detalle: string
}

export type DigestEntregable = { accountId: string; cliente: string; nombre: string; detalle: string; vencido: boolean }

export type Digest = {
  generatedAt: string
  totalClientes: number
  sincronizados: number
  sinDatosSalud: number
  buckets: {
    enRojo: DigestRow[]
    renovaciones: DigestRow[]
    bolsas: DigestRow[]
    sinContacto: DigestRow[]
    entregables: DigestEntregable[]
  }
  intro: string | null
}

const base = (r: PortfolioRow): Omit<DigestRow, "detalle"> => ({
  id: r.id,
  name: r.name,
  estrategico: r.estrategico,
  score: r.score,
  color: r.color,
})

export async function computeDigest(opts?: { conIntro?: boolean }): Promise<Digest> {
  const rows = await computePortfolio()

  const enRojo = rows
    .filter((r) => r.color === "rojo")
    .map((r) => ({ ...base(r), detalle: r.topRiesgo ?? `Salud ${r.score}` }))

  const renovaciones = rows
    .filter((r) => r.proximaRenovacionDias != null && r.proximaRenovacionDias <= RENOVACION_DIAS)
    .sort((a, b) => (a.proximaRenovacionDias ?? 0) - (b.proximaRenovacionDias ?? 0))
    .map((r) => ({
      ...base(r),
      detalle:
        r.proximaRenovacionDias! < 0
          ? `Renovación vencida hace ${Math.abs(r.proximaRenovacionDias!)} días`
          : `Renueva en ${r.proximaRenovacionDias} días`,
    }))

  const bolsas = rows
    .filter((r) => r.semanasParaAgotar != null && r.semanasParaAgotar <= BOLSA_SEMANAS)
    .sort((a, b) => (a.semanasParaAgotar ?? 0) - (b.semanasParaAgotar ?? 0))
    .map((r) => ({
      ...base(r),
      detalle:
        r.semanasParaAgotar === 0
          ? `Bolsa agotada (${r.bolsaPct ?? "—"}%)`
          : `~${r.semanasParaAgotar} semanas para agotar (${r.bolsaPct ?? "—"}%)`,
    }))

  const sinContacto = rows
    .filter((r) => r.diasSinContacto != null && r.diasSinContacto > SIN_CONTACTO_DIAS)
    .sort((a, b) => (b.diasSinContacto ?? 0) - (a.diasSinContacto ?? 0))
    .map((r) => ({ ...base(r), detalle: `${r.diasSinContacto} días sin contacto` }))

  // Entregables (valor agregado) vencidos o próximos a vencer.
  const deliverables = await computeDeliverables()
  const entregables: DigestEntregable[] = deliverables.rows
    .filter((d) => d.estado === "vencido" || d.estado === "proximo")
    .map((d) => ({
      accountId: d.accountId,
      cliente: d.cliente,
      nombre: d.nombre,
      vencido: d.estado === "vencido",
      detalle:
        d.dias == null
          ? d.nombre
          : d.dias < 0
            ? `vencido hace ${-d.dias}d`
            : d.dias === 0
              ? "vence hoy"
              : `vence en ${d.dias}d`,
    }))

  const buckets = { enRojo, renovaciones, bolsas, sinContacto, entregables }

  let intro: string | null = null
  if (opts?.conIntro) {
    intro = await generateDigestIntro({
      totalClientes: rows.length,
      enRojo: enRojo.length,
      renovaciones: renovaciones.length,
      bolsas: bolsas.length,
      sinContacto: sinContacto.length,
      entregablesPendientes: entregables.length,
      topRiesgos: enRojo.slice(0, 5).map((r) => `${r.name}: ${r.detalle}`),
    })
  }

  return {
    generatedAt: new Date().toISOString(),
    totalClientes: rows.length,
    sincronizados: rows.filter((r) => r.sincronizado).length,
    sinDatosSalud: rows.filter((r) => r.color === "gris").length,
    buckets,
    intro,
  }
}
