import { NextResponse } from "next/server"
import { requireSession, serverError } from "@/lib/api"
import { computeCapacity } from "@/lib/analytics/capacity"

export const dynamic = "force-dynamic"

// GET /api/analitica/capacidad — pronóstico de tickets/horas + bolsas por agotarse.
export async function GET() {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const capacity = await computeCapacity()
    return NextResponse.json(capacity)
  } catch (error) {
    return serverError(error)
  }
}
