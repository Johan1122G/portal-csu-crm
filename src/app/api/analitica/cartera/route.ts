import { NextResponse } from "next/server"
import { requireSession, serverError } from "@/lib/api"
import { computePortfolio } from "@/lib/analytics/portfolio"

// GET /api/analitica/cartera — salud de todos los clientes (triage del CSM).
export async function GET() {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const rows = await computePortfolio()
    return NextResponse.json({ rows })
  } catch (error) {
    return serverError(error)
  }
}
