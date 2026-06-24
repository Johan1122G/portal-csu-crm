import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError, badRequest } from "@/lib/api"
import { updateContactSchema } from "@/lib/validation"

type Params = { params: { id: string } }

// PUT /api/contactos/[id] — actualiza un contacto.
export async function PUT(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const parsed = updateContactSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())

    const updated = await prisma.contact.update({ where: { id: params.id }, data: parsed.data })
    return NextResponse.json(updated)
  } catch (error) {
    return serverError(error)
  }
}

// DELETE /api/contactos/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    await prisma.contact.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
