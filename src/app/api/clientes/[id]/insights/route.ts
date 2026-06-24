import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireSession, badRequest } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { computeClientAnalytics } from "@/lib/analytics/aggregate"
import { getContextProvider } from "@/lib/analytics/context"
import { isAiConfigured, generateFindings } from "@/lib/analytics/ai"

type Params = { params: { id: string } }

function parseDay(s: string | null, endOfDay = false): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T${endOfDay ? "23:59:59" : "00:00:00"}Z`)
  return isNaN(d.getTime()) ? null : d
}

// GET — hallazgos GUARDADOS (sin llamar a la IA, no consume tokens) + fecha del
// último análisis. La UI los muestra al abrir; solo se regeneran con POST.
export async function GET(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const findings = await prisma.insightFinding.findMany({
    where: { accountId: params.id },
    orderBy: { generatedon: "desc" },
  })
  const ultimoAnalisis = findings[0]?.generatedon ?? null
  return NextResponse.json({ configured: isAiConfigured(), findings, ultimoAnalisis })
}

// POST — regenera los hallazgos con IA y los GUARDA (reemplaza los anteriores).
export async function POST(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const cliente = await prisma.account.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  if (!isAiConfigured()) return NextResponse.json({ configured: false, findings: [] })

  const from = parseDay(req.nextUrl.searchParams.get("from"))
  const to = parseDay(req.nextUrl.searchParams.get("to"), true)

  const analytics = await computeClientAnalytics(params.id, from, to)
  if (analytics.resumen.totalTickets === 0) {
    return NextResponse.json({
      configured: true,
      findings: [],
      note: "No hay tickets sincronizados para este cliente. Ejecuta el sync de analítica primero.",
    })
  }

  const context = await getContextProvider().getContext(params.id)
  if (!context) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })

  try {
    // Catálogo BEXT para que la IA recomiende servicios reales (upsell).
    const catalogo = await prisma.serviceCatalogItem.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, unidad: true, categoria: true, descripcion: true },
    })
    const catById = new Map(catalogo.map((c) => [c.nombre.toLowerCase(), c.id]))

    const generados = await generateFindings({ analytics, context, catalogo })
    const session = await auth()
    const generatedon = new Date()
    const generatedBy = session?.user?.email ?? null

    // Reemplaza el lote anterior (idempotente).
    await prisma.$transaction([
      prisma.insightFinding.deleteMany({ where: { accountId: params.id } }),
      prisma.insightFinding.createMany({
        data: generados.map((f) => ({
          accountId: params.id,
          titulo: f.titulo,
          tipo: f.tipo,
          evidencia: f.evidencia,
          recomendacion: f.recomendacion,
          impacto: f.impacto,
          confianza: f.confianza,
          servicio: f.servicio || null,
          serviceCatalogItemId: f.servicio ? (catById.get(f.servicio.toLowerCase()) ?? null) : null,
          generatedon,
          generatedBy,
        })),
      }),
    ])

    const findings = await prisma.insightFinding.findMany({
      where: { accountId: params.id },
      orderBy: { generatedon: "desc" },
    })
    return NextResponse.json({ configured: true, findings, ultimoAnalisis: generatedon })
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Error generando hallazgos con IA")
  }
}
