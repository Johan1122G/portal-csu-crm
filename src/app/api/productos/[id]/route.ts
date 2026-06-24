import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError, badRequest } from "@/lib/api"
import { updateProductSchema } from "@/lib/validation"

type Params = { params: { id: string } }

// PUT /api/productos/[id] — actualiza un producto/servicio.
export async function PUT(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const parsed = updateProductSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())

    const updated = await prisma.productService.update({ where: { id: params.id }, data: parsed.data })
    return NextResponse.json(updated)
  } catch (error) {
    return serverError(error)
  }
}

// DELETE /api/productos/[id] — borra físicamente (no preserva historial; es un sub-registro).
export async function DELETE(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    await prisma.productService.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
