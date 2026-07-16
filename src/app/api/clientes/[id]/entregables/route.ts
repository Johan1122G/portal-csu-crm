import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireSession, badRequest, serverError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

type Params = { params: { id: string } }

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T12:00:00` : s)
  return isNaN(d.getTime()) ? null : d
}

// GET — entregables del cliente (con su historial reciente).
export async function GET(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth
  try {
    const deliverables = await prisma.deliverable.findMany({
      where: { accountId: params.id },
      orderBy: [{ activo: "desc" }, { proximaEntrega: "asc" }, { nombre: "asc" }],
      include: { logs: { orderBy: { entregadoOn: "desc" }, take: 12 } },
    })
    return NextResponse.json({ deliverables })
  } catch (error) {
    return serverError(error)
  }
}

const createSchema = z.object({
  nombre: z.string().min(1),
  categoria: z.string().nullish(),
  frecuencia: z.string().min(1),
  responsable: z.string().nullish(),
  proximaEntrega: z.string().nullish(),
  notificarDiasAntes: z.number().int().min(0).max(90).nullish(),
  notas: z.string().nullish(),
})

// POST — crea un entregable para el cliente.
export async function POST(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const cliente = await prisma.account.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())
  const d = parsed.data

  try {
    const deliverable = await prisma.deliverable.create({
      data: {
        accountId: params.id,
        nombre: d.nombre,
        categoria: d.categoria ?? null,
        frecuencia: d.frecuencia,
        responsable: d.responsable ?? null,
        proximaEntrega: parseDate(d.proximaEntrega),
        notificarDiasAntes: d.notificarDiasAntes ?? 5,
        notas: d.notas ?? null,
      },
    })
    return NextResponse.json({ ok: true, deliverable })
  } catch (error) {
    return serverError(error)
  }
}
