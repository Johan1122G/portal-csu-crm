import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { serverError } from "@/lib/api"
import { computeDigest } from "@/lib/analytics/digest"

export const dynamic = "force-dynamic"

// Autoriza por header secreto (para schedulers como Logic App) o por sesión (para
// la página del portal). Mismo patrón que /api/analitica/sync.
async function authorize(req: NextRequest): Promise<boolean> {
  const secret = process.env.ANALYTICS_SYNC_SECRET
  if (secret && req.headers.get("x-sync-secret") === secret) return true
  const session = await auth()
  return !!session?.user
}

// GET /api/analitica/digest — resumen accionable de la cartera para el CSM.
// ?intro=1 añade un párrafo narrativo con IA (opcional; el digest funciona sin él).
export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const conIntro = req.nextUrl.searchParams.get("intro") === "1"

  try {
    const digest = await computeDigest({ conIntro })
    return NextResponse.json(digest)
  } catch (error) {
    return serverError(error)
  }
}
