import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { requireSession, badRequest } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { computeClientAnalytics } from "@/lib/analytics/aggregate"
import { isAiConfigured, answerClientQuestion } from "@/lib/analytics/ai"
import { buscarTickets, type TicketFiltro } from "@/lib/analytics/retrieval"

type Params = { params: { id: string } }

const bodySchema = z.object({
  pregunta: z.string().min(1, "Pregunta vacía").max(2000),
  threadId: z.string().nullish(), // acepta string | null | undefined (conversación nueva)
})

function resumen(a: Awaited<ReturnType<typeof computeClientAnalytics>>): string {
  const r = a.resumen
  const cats = a.porCategoria.slice(0, 8).map((c) => `${c.categoria}: ${c.casos} (${c.pct}%)`).join("; ")
  const tend = a.tendenciaMensual.slice(-6).map((m) => `${m.mes}:${m.casos}`).join(" ")
  return [
    `Total tickets: ${r.totalTickets} (abiertos ${r.abiertos}, cerrados ${r.cerrados}).`,
    `Horas totales: ${r.horasTotales}. Resolución prom: ${r.resolucionPromedioHoras ?? "—"} h. SLA incumplido: ${r.slaIncumplidoPct}%.`,
    `CSAT prom: ${r.csatPromedio ?? "—"} (${r.csatRespuestas} respuestas). Categorización: ${r.categorizacionPct}%.`,
    `Categorías principales: ${cats || "—"}.`,
    `Tendencia mensual (casos): ${tend || "—"}.`,
    a.recurrentes.length ? `Recurrentes: ${a.recurrentes.slice(0, 5).map((x) => `${x.tema} (${x.casos})`).join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

// POST /api/clientes/[id]/preguntar — Q&A persistente (tool calling). Guarda la
// conversación en un hilo (tipo chat de Copilot) y usa su historial.
export async function POST(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const cliente = await prisma.account.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  if (!isAiConfigured()) return NextResponse.json({ configured: false })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())
  const { pregunta } = parsed.data

  const analytics = await computeClientAnalytics(params.id)
  if (analytics.resumen.totalTickets === 0) {
    return NextResponse.json({
      configured: true,
      respuesta: "Este cliente no tiene tickets sincronizados. Ejecuta el sync de analítica primero.",
    })
  }

  // Hilo: usar el existente o crear uno nuevo (título = inicio de la pregunta).
  const session = await auth()
  let threadId: string | undefined = parsed.data.threadId ?? undefined
  if (threadId) {
    const t = await prisma.insightThread.findFirst({ where: { id: threadId, accountId: params.id }, select: { id: true } })
    if (!t) threadId = undefined
  }
  if (!threadId) {
    const t = await prisma.insightThread.create({
      data: {
        accountId: params.id,
        title: pregunta.slice(0, 80),
        createdBy: session?.user?.email ?? null,
      },
    })
    threadId = t.id
  }

  // Historial del hilo (para contexto conversacional).
  const previos = await prisma.insightMessage.findMany({
    where: { threadId },
    orderBy: { createdon: "asc" },
    take: 16,
  })
  const historial = previos.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))

  try {
    const { respuesta } = await answerClientQuestion({
      pregunta,
      contextoResumen: resumen(analytics),
      historial,
      ejecutarBusqueda: (filtros) => buscarTickets(params.id, filtros as TicketFiltro),
    })

    await prisma.$transaction([
      prisma.insightMessage.create({ data: { threadId, role: "user", content: pregunta } }),
      prisma.insightMessage.create({ data: { threadId, role: "assistant", content: respuesta } }),
      prisma.insightThread.update({ where: { id: threadId }, data: { modifiedon: new Date() } }),
    ])

    return NextResponse.json({ configured: true, threadId, respuesta })
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Error generando la respuesta")
  }
}
