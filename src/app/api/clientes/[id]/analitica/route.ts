import { NextRequest, NextResponse } from "next/server"
import { requireSession, badRequest } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { computeClientAnalytics } from "@/lib/analytics/aggregate"
import { computeClientHealth } from "@/lib/analytics/health"
import { getContextProvider } from "@/lib/analytics/context"

type Params = { params: { id: string } }

function parseDay(s: string | null, endOfDay = false): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T${endOfDay ? "23:59:59" : "00:00:00"}Z`)
  return isNaN(d.getTime()) ? null : d
}

// GET /api/clientes/[id]/analitica?from=YYYY-MM-DD&to=YYYY-MM-DD
// Agregados determinísticos de los tickets GLPI del cliente (sin IA).
export async function GET(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const cliente = await prisma.account.findUnique({
    where: { id: params.id },
    select: { id: true, cr_bex_glpientityid: true },
  })
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })

  const from = parseDay(req.nextUrl.searchParams.get("from"))
  const to = parseDay(req.nextUrl.searchParams.get("to"), true)
  if (from && to && from > to) return badRequest("Rango de fechas inválido.")

  const analytics = await computeClientAnalytics(params.id, from, to)

  // Pistas para la UI: sin vínculo GLPI, o vinculado pero aún sin sincronizar.
  const vinculado = !!cliente.cr_bex_glpientityid
  const sincronizado = analytics.ultimoSync != null

  // Salud del cliente (Health Score + módulos CSM). Usa el contexto + agregados.
  const context = await getContextProvider().getContext(params.id)
  const salud = context ? await computeClientHealth(params.id, analytics, context) : null

  return NextResponse.json({ ...analytics, vinculado, sincronizado, salud })
}
