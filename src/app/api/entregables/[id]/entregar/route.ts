import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { requireSession, badRequest, serverError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { siguienteFecha } from "@/lib/deliverables/cadence"

type Params = { params: { id: string } }

const bodySchema = z.object({ nota: z.string().nullish(), entregadoPor: z.string().nullish() }).nullable()

// POST — marca un entregable como ENTREGADO: registra el log, actualiza última
// entrega y avanza la próxima según la frecuencia ("Única vez" lo inactiva).
export async function POST(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const deliverable = await prisma.deliverable.findUnique({ where: { id: params.id } })
  if (!deliverable) return NextResponse.json({ error: "Entregable no encontrado" }, { status: 404 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest("Datos inválidos")
  const body = parsed.data

  const now = new Date()
  const base = deliverable.proximaEntrega ?? now
  const siguiente = siguienteFecha(base, deliverable.frecuencia)
  const periodo = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
  const session = await auth()
  const entregadoPor = body?.entregadoPor ?? session?.user?.email ?? null

  try {
    const [, updated] = await prisma.$transaction([
      prisma.deliverableLog.create({
        data: { deliverableId: deliverable.id, entregadoOn: now, periodo, entregadoPor, nota: body?.nota ?? null },
      }),
      prisma.deliverable.update({
        where: { id: deliverable.id },
        data: {
          ultimaEntrega: now,
          proximaEntrega: siguiente,
          activo: siguiente == null ? false : deliverable.activo, // "Única vez" → inactivo
        },
      }),
    ])
    const withLogs = await prisma.deliverable.findUnique({
      where: { id: deliverable.id },
      include: { logs: { orderBy: { entregadoOn: "desc" }, take: 12 } },
    })
    return NextResponse.json({ ok: true, deliverable: withLogs ?? updated })
  } catch (error) {
    return serverError(error)
  }
}
