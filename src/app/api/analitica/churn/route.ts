import { NextResponse } from "next/server"
import { requireSession, serverError } from "@/lib/api"
import { computeChurn } from "@/lib/analytics/churn"

export const dynamic = "force-dynamic"

// GET /api/analitica/churn — ranking de riesgo de fuga por cliente (heurístico).
export async function GET() {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const churn = await computeChurn()
    return NextResponse.json(churn)
  } catch (error) {
    return serverError(error)
  }
}
