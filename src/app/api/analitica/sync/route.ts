import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { badRequest, serverError } from "@/lib/api"
import { fetchClientTicketFacts, type GlpiTicketFactRow } from "@/lib/glpi/client"
import { getContextProvider } from "@/lib/analytics/context"

const bodySchema = z.object({ clientId: z.string().optional() }).nullable()

// Autoriza por header secreto (para schedulers como Logic App) o por sesión (para
// el botón manual en la UI).
async function authorize(req: NextRequest): Promise<boolean> {
  const secret = process.env.ANALYTICS_SYNC_SECRET
  if (secret && req.headers.get("x-sync-secret") === secret) return true
  const session = await auth()
  return !!session?.user
}

const parseGlpiDate = (s: string | null): Date | null => {
  if (!s) return null
  const d = new Date(s.trim().replace(" ", "T"))
  return isNaN(d.getTime()) ? null : d
}

// Convierte una fila cruda de GLPI en datos de GlpiTicketFact (parseo + cálculos).
function toFact(accountId: string, r: GlpiTicketFactRow) {
  const openedAt = parseGlpiDate(r.openedAt)
  const endAt = parseGlpiDate(r.solvedAt) ?? parseGlpiDate(r.closedAt)
  const resolutionHours =
    openedAt && endAt && endAt >= openedAt
      ? Math.round(((endAt.getTime() - openedAt.getTime()) / 3_600_000) * 10) / 10
      : null
  return {
    accountId,
    glpiTicketId: r.glpiTicketId,
    subject: r.subject || null,
    content: r.content,
    category: r.category,
    status: r.status,
    openedAt,
    closedAt: parseGlpiDate(r.closedAt),
    resolutionHours,
    actiontimeHours: Math.round((r.actiontimeSeconds / 3600) * 10) / 10,
    satisfaction: r.satisfaction,
    isLate: r.isLate,
  }
}

// Sincroniza los hechos de un cliente: reemplaza sus filas (delete+createMany en
// transacción) para reflejar también tickets removidos/cambiados.
async function syncClient(client: { id: string; glpiEntityId: string }) {
  const rows = await fetchClientTicketFacts(client.glpiEntityId)
  const facts = rows.map((r) => toFact(client.id, r))
  await prisma.$transaction([
    prisma.glpiTicketFact.deleteMany({ where: { accountId: client.id } }),
    prisma.glpiTicketFact.createMany({ data: facts }),
  ])
  return facts.length
}

// POST /api/analitica/sync — pobla la tabla de hechos desde GLPI.
// Body opcional { clientId } para sincronizar un solo cliente; sin él, todos los
// clientes vinculados a GLPI.
export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  const clientId = parsed.success ? parsed.data?.clientId : undefined

  const provider = getContextProvider()

  let targets: { id: string; glpiEntityId: string }[]
  if (clientId) {
    const ctx = await provider.getContext(clientId)
    if (!ctx) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    if (!ctx.glpiEntityId) return badRequest("El cliente no está vinculado a una entidad de GLPI.")
    targets = [{ id: ctx.id, glpiEntityId: ctx.glpiEntityId }]
  } else {
    targets = await provider.listGlpiLinkedClients()
  }

  try {
    let totalTickets = 0
    const perClient: { id: string; tickets: number }[] = []
    // Secuencial para no saturar GLPI con sesiones en paralelo.
    for (const t of targets) {
      const n = await syncClient(t)
      totalTickets += n
      perClient.push({ id: t.id, tickets: n })
    }
    return NextResponse.json({ ok: true, clientes: targets.length, tickets: totalTickets, perClient })
  } catch (error) {
    return serverError(error)
  }
}
