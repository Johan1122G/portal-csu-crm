import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError, badRequest } from "@/lib/api"
import { updateClienteSchema } from "@/lib/validation"

type Params = { params: { id: string } }

// GET /api/clientes/[id] — cliente con todas sus relaciones.
export async function GET(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const cliente = await prisma.account.findUnique({
      where: { id: params.id },
      include: {
        contacts: { orderBy: { createdon: "asc" } },
        relationships: { orderBy: { createdon: "asc" } },
        products: { orderBy: { createdon: "desc" } },
        activities: { orderBy: { scheduledstart: "desc" } },
        opportunities: { orderBy: { createdon: "desc" } },
      },
    })

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }
    return NextResponse.json(cliente)
  } catch (error) {
    return serverError(error)
  }
}

// PUT /api/clientes/[id] — actualiza campos del account (no el accountnumber/NIT).
export async function PUT(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const body = await req.json()
    const parsed = updateClienteSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest("Datos inválidos", parsed.error.flatten())
    }

    const updated = await prisma.account.update({
      where: { id: params.id },
      data: parsed.data,
      select: { id: true, name: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    // P2002 = violación de unique (NIT duplicado).
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      return badRequest("Ya existe otro cliente con ese NIT")
    }
    return serverError(error)
  }
}

// DELETE /api/clientes/[id] — borrado lógico: estado → Inactivo (preserva historial).
export async function DELETE(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    await prisma.account.update({
      where: { id: params.id },
      data: { cr_bex_estadocliente: "Inactivo" },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
