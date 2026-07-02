import { NextRequest, NextResponse } from "next/server"
import { requireSession, badRequest } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { computeClientAnalytics } from "@/lib/analytics/aggregate"
import { computeClientHealth } from "@/lib/analytics/health"
import { getContextProvider } from "@/lib/analytics/context"
import { isAiConfigured, suggestActions } from "@/lib/analytics/ai"

type Params = { params: { id: string } }

// POST — genera BORRADORES de acciones (tareas sugeridas) con IA a partir de la
// salud y métricas del cliente. NO persiste: el CSM aprueba las que quiera desde
// la UI (que las crea vía POST /clientes/[id]/tareas).
export async function POST(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const context = await getContextProvider().getContext(params.id)
  if (!context) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  if (!isAiConfigured()) return NextResponse.json({ configured: false, acciones: [] })

  const analytics = await computeClientAnalytics(params.id)
  if (analytics.resumen.totalTickets === 0) {
    return NextResponse.json({
      configured: true,
      acciones: [],
      note: "Aún no hay tickets sincronizados para sugerir acciones basadas en datos. Sincroniza la analítica primero.",
    })
  }

  try {
    const salud = await computeClientHealth(params.id, analytics, context)
    const acciones = await suggestActions({ analytics, context, salud })
    return NextResponse.json({ configured: true, acciones })
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Error generando sugerencias con IA")
  }
}
