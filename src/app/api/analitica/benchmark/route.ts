import { NextResponse } from "next/server"
import { requireSession, serverError } from "@/lib/api"
import { computeBenchmark } from "@/lib/analytics/benchmark"

export const dynamic = "force-dynamic"

// GET /api/analitica/benchmark — compara cada cliente vs sus pares (por industria).
export async function GET() {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const benchmark = await computeBenchmark()
    return NextResponse.json(benchmark)
  } catch (error) {
    return serverError(error)
  }
}
