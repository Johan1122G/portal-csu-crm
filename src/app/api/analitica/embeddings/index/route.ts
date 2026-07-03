import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { badRequest } from "@/lib/api"
import { isEmbeddingsConfigured, indexClientTickets, indexAll } from "@/lib/analytics/embeddings"

export const dynamic = "force-dynamic"

const bodySchema = z.object({ clientId: z.string().nullish() }).nullable()

// Autoriza por header secreto (scheduler) o por sesión (botón manual).
async function authorize(req: NextRequest): Promise<boolean> {
  const secret = process.env.ANALYTICS_SYNC_SECRET
  if (secret && req.headers.get("x-sync-secret") === secret) return true
  const session = await auth()
  return !!session?.user
}

// POST /api/analitica/embeddings/index — indexa tickets (uno o todos los clientes).
export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isEmbeddingsConfigured()) return NextResponse.json({ configured: false })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  const clientId = parsed.success ? parsed.data?.clientId : undefined

  try {
    if (clientId) {
      const r = await indexClientTickets(clientId)
      return NextResponse.json({ configured: true, ...r })
    }
    const r = await indexAll()
    return NextResponse.json({ configured: true, ...r })
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Error indexando embeddings")
  }
}
