import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError, badRequest } from "@/lib/api"
import { updateRelationshipSchema } from "@/lib/validation"

type Params = { params: { id: string } }

// PUT /api/relacionamiento/[id] — actualiza una persona BEXT.
export async function PUT(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const parsed = updateRelationshipSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())

    const updated = await prisma.bextRelationship.update({ where: { id: params.id }, data: parsed.data })
    return NextResponse.json(updated)
  } catch (error) {
    return serverError(error)
  }
}

// DELETE /api/relacionamiento/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    await prisma.bextRelationship.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
