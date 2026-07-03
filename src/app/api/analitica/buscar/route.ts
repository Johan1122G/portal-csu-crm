import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireSession, badRequest } from "@/lib/api"
import { isEmbeddingsConfigured, searchTickets } from "@/lib/analytics/embeddings"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  q: z.string().min(2, "Escribe al menos 2 caracteres"),
  clientId: z.string().nullish(),
  topK: z.number().int().positive().max(50).nullish(),
})

// POST /api/analitica/buscar — búsqueda semántica sobre tickets (embeddings).
export async function POST(req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth
  if (!isEmbeddingsConfigured()) return NextResponse.json({ configured: false, hits: [] })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())

  try {
    const hits = await searchTickets({
      q: parsed.data.q,
      accountId: parsed.data.clientId ?? undefined,
      topK: parsed.data.topK ?? undefined,
    })
    return NextResponse.json({ configured: true, hits })
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Error en la búsqueda semántica")
  }
}
