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

const patchSchema = z.object({
  nombre: z.string().min(1).optional(),
  categoria: z.string().nullish(),
  frecuencia: z.string().min(1).optional(),
  responsable: z.string().nullish(),
  proximaEntrega: z.string().nullish(),
  notificarDiasAntes: z.number().int().min(0).max(90).optional(),
  activo: z.boolean().optional(),
  notas: z.string().nullish(),
})

// PATCH — edita un entregable.
export async function PATCH(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())
  const d = parsed.data

  try {
    const deliverable = await prisma.deliverable.update({
      where: { id: params.id },
      data: {
        ...(d.nombre !== undefined ? { nombre: d.nombre } : {}),
        ...(d.categoria !== undefined ? { categoria: d.categoria } : {}),
        ...(d.frecuencia !== undefined ? { frecuencia: d.frecuencia } : {}),
        ...(d.responsable !== undefined ? { responsable: d.responsable } : {}),
        ...(d.proximaEntrega !== undefined ? { proximaEntrega: parseDate(d.proximaEntrega) } : {}),
        ...(d.notificarDiasAntes !== undefined ? { notificarDiasAntes: d.notificarDiasAntes } : {}),
        ...(d.activo !== undefined ? { activo: d.activo } : {}),
        ...(d.notas !== undefined ? { notas: d.notas } : {}),
      },
    })
    return NextResponse.json({ ok: true, deliverable })
  } catch (error) {
    return serverError(error)
  }
}

// DELETE — elimina un entregable (y su historial, por cascada).
export async function DELETE(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth
  try {
    await prisma.deliverable.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
