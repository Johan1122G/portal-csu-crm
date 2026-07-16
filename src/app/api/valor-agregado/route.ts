import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { serverError } from "@/lib/api"
import { computeDeliverables } from "@/lib/deliverables/overview"

export const dynamic = "force-dynamic"

// Autoriza por header secreto (scheduler/Logic App) o por sesión (página del portal).
async function authorize(req: NextRequest): Promise<boolean> {
  const secret = process.env.ANALYTICS_SYNC_SECRET
  if (secret && req.headers.get("x-sync-secret") === secret) return true
  const session = await auth()
  return !!session?.user
}

// GET /api/valor-agregado — resumen global de entregables (vencidos/próximos/al día).
// Queda FUERA del middleware para que una Logic App lo consuma con x-sync-secret.
export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const data = await computeDeliverables()
    return NextResponse.json(data)
  } catch (error) {
    return serverError(error)
  }
}
