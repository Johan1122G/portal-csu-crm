import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/api"
import { getContextProvider } from "@/lib/analytics/context"

type Params = { params: { id: string } }

// GET /api/analitica/context/[id] — devuelve el ClientContext (verificación de la
// Fase 0; también lo consumirá la capa de IA más adelante).
export async function GET(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const ctx = await getContextProvider().getContext(params.id)
  if (!ctx) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  return NextResponse.json(ctx)
}
