import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireSession, badRequest, serverError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

type Params = { params: { id: string } }

const ESTADOS = ["Pendiente", "En progreso", "Hecha", "Descartada"] as const

const patchSchema = z.object({
  titulo: z.string().min(1).optional(),
  detalle: z.string().nullish(),
  responsable: z.string().nullish(),
  prioridad: z.enum(["Alta", "Media", "Baja"]).nullish(),
  estado: z.enum(ESTADOS).optional(),
  vence: z.string().nullish(),
})

function parseVence(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T12:00:00` : s)
  return isNaN(d.getTime()) ? null : d
}

// PATCH — edita una tarea (cambiar estado, responsable, fecha, etc.).
export async function PATCH(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())
  const d = parsed.data

  try {
    const task = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...(d.titulo !== undefined ? { titulo: d.titulo } : {}),
        ...(d.detalle !== undefined ? { detalle: d.detalle } : {}),
        ...(d.responsable !== undefined ? { responsable: d.responsable } : {}),
        ...(d.prioridad !== undefined ? { prioridad: d.prioridad } : {}),
        ...(d.vence !== undefined ? { vence: parseVence(d.vence) } : {}),
        ...(d.estado !== undefined
          ? { estado: d.estado, completadaOn: d.estado === "Hecha" ? new Date() : null }
          : {}),
      },
    })
    return NextResponse.json({ ok: true, task })
  } catch (error) {
    return serverError(error)
  }
}

// DELETE — elimina una tarea.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth
  try {
    await prisma.task.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
