import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { badRequest } from "@/lib/api"
import { isGraphConfigured, fetchTenantMeetingsForClient } from "@/lib/graph/client"

type Params = { params: { id: string } }

// Ventana amplia que se cachea en cada sync.
const SYNC_DIAS_ATRAS = 180
const SYNC_DIAS_ADELANTE = 90

const DOMINIOS_PUBLICOS = new Set(["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "live.com", "icloud.com"])
const domainOf = (email: string) => email.split("@")[1]?.toLowerCase() ?? ""

function parseDay(s: string | null, endOfDay = false): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T${endOfDay ? "23:59:59" : "00:00:00"}Z`)
  return isNaN(d.getTime()) ? null : d
}

const parsePeople = (s: string | null): { name: string; email: string }[] => {
  if (!s) return []
  try {
    const a = JSON.parse(s)
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}

// GET — reuniones desde la CACHÉ (rápido, sin golpear Graph). ?from=&to= filtra.
export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const from = parseDay(req.nextUrl.searchParams.get("from"))
  const to = parseDay(req.nextUrl.searchParams.get("to"), true)

  const rows = await prisma.teamsMeetingCache.findMany({
    where: {
      accountId: params.id,
      ...(from || to ? { startAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    orderBy: { startAt: "desc" },
  })

  const ultimoSyncRow = await prisma.teamsMeetingCache.findFirst({
    where: { accountId: params.id },
    orderBy: { syncedAt: "desc" },
    select: { syncedAt: true },
  })

  const meetings = rows.map((m) => ({
    id: m.id,
    subject: m.subject,
    start: m.startAt ? m.startAt.toISOString() : "",
    end: m.endAt ? m.endAt.toISOString() : "",
    organizer: m.organizer ?? "",
    isOnline: m.isOnline,
    joinUrl: m.joinUrl,
    webLink: m.webLink,
    bextParticipants: parsePeople(m.bextParticipants),
    clientParticipants: parsePeople(m.clientParticipants),
    tieneAnalisis: m.analisis != null,
  }))

  const nowISO = new Date().toISOString()
  return NextResponse.json({
    configured: isGraphConfigured(),
    ultimoSync: ultimoSyncRow?.syncedAt ?? null,
    proxima: [...meetings].reverse().find((m) => m.start >= nowISO)?.start ?? null,
    ultima: meetings.find((m) => m.start < nowISO)?.start ?? null,
    meetings,
  })
}

// POST — sincroniza desde Graph (escaneo del tenant) y cachea en DB.
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isGraphConfigured()) return NextResponse.json({ configured: false })

  const cliente = await prisma.account.findUnique({
    where: { id: params.id },
    select: { id: true, contacts: { select: { emailaddress1: true } } },
  })
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })

  const dominios = Array.from(
    new Set(cliente.contacts.map((c) => domainOf(c.emailaddress1)).filter((d) => d && !DOMINIOS_PUBLICOS.has(d))),
  )
  if (dominios.length === 0) {
    return NextResponse.json({ configured: true, synced: 0, note: "El cliente no tiene contactos con correo corporativo." })
  }

  const now = new Date()
  const from = new Date(now)
  from.setDate(now.getDate() - SYNC_DIAS_ATRAS)
  const to = new Date(now)
  to.setDate(now.getDate() + SYNC_DIAS_ADELANTE)

  try {
    const { meetings } = await fetchTenantMeetingsForClient(dominios, from.toISOString(), to.toISOString())
    const syncedAt = new Date()
    for (const m of meetings) {
      const data = {
        subject: m.subject,
        startAt: m.start ? new Date(m.start) : null,
        endAt: m.end ? new Date(m.end) : null,
        organizer: m.organizer || null,
        organizerEmail: m.organizerEmail || null,
        isOnline: m.isOnline,
        joinUrl: m.joinUrl,
        webLink: m.webLink,
        bextParticipants: JSON.stringify(m.bextParticipants),
        clientParticipants: JSON.stringify(m.clientParticipants),
        syncedAt,
      }
      await prisma.teamsMeetingCache.upsert({
        where: { accountId_iCalUId: { accountId: params.id, iCalUId: m.iCalUId } },
        create: { accountId: params.id, iCalUId: m.iCalUId, ...data },
        update: data, // preserva transcript/aiNotes/analisis existentes
      })
    }
    return NextResponse.json({ configured: true, synced: meetings.length })
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Error sincronizando reuniones desde Graph")
  }
}
