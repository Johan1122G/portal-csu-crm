import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError, badRequest } from "@/lib/api"
import { createContactSchema } from "@/lib/validation"

// POST /api/contactos — agrega un contacto a un cliente.
export async function POST(req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const parsed = createContactSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())

    const created = await prisma.contact.create({ data: parsed.data })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
