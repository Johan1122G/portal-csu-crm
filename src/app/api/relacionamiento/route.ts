import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError, badRequest } from "@/lib/api"
import { createRelationshipSchema } from "@/lib/validation"

// POST /api/relacionamiento — agrega una persona BEXT al relacionamiento del cliente.
export async function POST(req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const parsed = createRelationshipSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())

    const created = await prisma.bextRelationship.create({ data: parsed.data })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
