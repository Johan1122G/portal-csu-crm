import { NextRequest, NextResponse } from "next/server"
import { requireSession, serverError } from "@/lib/api"
import { computeQbr } from "@/lib/analytics/qbr"

export const dynamic = "force-dynamic"

// GET /api/clientes/[id]/qbr — paquete de datos del QBR.
// ?narrativa=1 añade el texto ejecutivo con IA (opcional).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const conNarrativa = req.nextUrl.searchParams.get("narrativa") === "1"

  try {
    const qbr = await computeQbr(params.id, { conNarrativa })
    if (!qbr) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    return NextResponse.json(qbr)
  } catch (error) {
    return serverError(error)
  }
}
