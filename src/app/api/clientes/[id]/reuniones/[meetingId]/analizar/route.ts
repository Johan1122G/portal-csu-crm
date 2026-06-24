import { NextRequest, NextResponse } from "next/server"
import { requireSession, badRequest, serverError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { fetchMeetingArtifacts } from "@/lib/graph/client"
import { isAiConfigured, analyzeMeeting } from "@/lib/analytics/ai"

type Params = { params: { id: string; meetingId: string } }

const BEXT_DOMAIN = (process.env.GRAPH_BEXT_DOMAIN || "bextsa.com").toLowerCase()
const isBext = (email?: string | null) => !!email && email.toLowerCase().endsWith("@" + BEXT_DOMAIN)

// Elige un buzón BEXT desde el cual pedir la transcripción (organizador o un
// participante interno).
function bextMailbox(organizerEmail: string | null, bextParticipantsJson: string | null): string | null {
  if (isBext(organizerEmail)) return organizerEmail!
  try {
    const ps = JSON.parse(bextParticipantsJson ?? "[]") as { email: string }[]
    const p = ps.find((x) => isBext(x.email))
    return p?.email ?? null
  } catch {
    return null
  }
}

// POST — trae transcripción/notas IA de la reunión (si faltan) y genera el análisis.
export async function POST(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const m = await prisma.teamsMeetingCache.findFirst({
    where: { id: params.meetingId, accountId: params.id },
    include: { account: { select: { name: true } } },
  })
  if (!m) return NextResponse.json({ error: "Reunión no encontrada" }, { status: 404 })
  if (!isAiConfigured()) return NextResponse.json({ configured: false })

  try {
    let transcript = m.transcript
    let aiNotes: unknown = m.aiNotes ? JSON.parse(m.aiNotes) : null

    // Traer contenido de Graph si aún no está cacheado.
    if (!transcript && !aiNotes) {
      if (!m.joinUrl) return badRequest("La reunión no tiene enlace de Teams (sin transcripción posible).")
      const mailbox = bextMailbox(m.organizerEmail, m.bextParticipants)
      if (!mailbox) return badRequest("No se encontró un buzón BEXT (organizador/participante) para leer la reunión.")

      const art = await fetchMeetingArtifacts(mailbox, m.joinUrl)
      transcript = art.transcript
      aiNotes = art.aiNotes
      if (!transcript && !aiNotes) {
        return NextResponse.json({ configured: true, ok: false, motivo: art.motivo ?? "Sin contenido disponible." })
      }
      // Cachear el contenido traído.
      await prisma.teamsMeetingCache.update({
        where: { id: m.id },
        data: { transcript: transcript ?? null, aiNotes: aiNotes ? JSON.stringify(aiNotes) : null },
      })
    }

    const analisis = await analyzeMeeting({ clienteNombre: m.account.name, transcript, aiNotes })
    await prisma.teamsMeetingCache.update({
      where: { id: m.id },
      data: { analisis: JSON.stringify(analisis), analizadoOn: new Date() },
    })
    return NextResponse.json({ configured: true, ok: true, analisis })
  } catch (error) {
    return serverError(error)
  }
}

// GET — devuelve el análisis guardado (si existe).
export async function GET(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const m = await prisma.teamsMeetingCache.findFirst({
    where: { id: params.meetingId, accountId: params.id },
    select: { analisis: true, analizadoOn: true, transcript: true },
  })
  if (!m) return NextResponse.json({ error: "Reunión no encontrada" }, { status: 404 })
  return NextResponse.json({
    analisis: m.analisis ? JSON.parse(m.analisis) : null,
    analizadoOn: m.analizadoOn,
    tieneTranscript: !!m.transcript,
  })
}
