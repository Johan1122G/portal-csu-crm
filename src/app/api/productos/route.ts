import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError, badRequest } from "@/lib/api"
import { productSchema } from "@/lib/validation"

// POST /api/productos — crea un producto/servicio para un cliente.
export async function POST(req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const parsed = productSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())

    const created = await prisma.productService.create({ data: parsed.data })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
