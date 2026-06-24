import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError, badRequest } from "@/lib/api"

type Params = { params: { id: string } }

const updateSchema = z.object({
  value: z.string().trim().min(1).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

// PUT /api/catalogos/[id] — renombrar valor, activar/desactivar, reordenar.
export async function PUT(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const parsed = updateSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())
    const updated = await prisma.catalog.update({ where: { id: params.id }, data: parsed.data })
    return NextResponse.json(updated)
  } catch (error) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      return badRequest("Ya existe ese valor en la lista")
    }
    return serverError(error)
  }
}

// DELETE /api/catalogos/[id] — elimina físicamente una opción (úsese para corregir
// una recién agregada; para ocultar sin perder historial, mejor desactivar con PUT).
export async function DELETE(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    await prisma.catalog.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
