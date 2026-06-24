import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError, badRequest } from "@/lib/api"
import { activitySchema } from "@/lib/validation"

// GET /api/actividades — todas las gestiones CS (global), con nombre de cliente.
// Filtros: tipo, responsable, area, accountId, search
export async function GET(req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const { searchParams } = req.nextUrl
    const tipo = searchParams.get("tipo") ?? undefined
    const area = searchParams.get("area") ?? undefined
    const accountId = searchParams.get("accountId") ?? undefined
    const search = searchParams.get("search")?.trim()

    const where: Prisma.CSActivityWhereInput = {
      ...(tipo ? { cr_bex_tipogestion: tipo } : {}),
      ...(area ? { cr_bex_areaescalar: area } : {}),
      ...(accountId ? { accountId } : {}),
      ...(search
        ? {
            OR: [
              { subject: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    }

    const data = await prisma.cSActivity.findMany({
      where,
      orderBy: { scheduledstart: "desc" },
      take: 200,
      include: { account: { select: { id: true, name: true } } },
    })
    return NextResponse.json({ data })
  } catch (error) {
    return serverError(error)
  }
}

// POST /api/actividades — registra una gestión CS.
export async function POST(req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const parsed = activitySchema.safeParse(await req.json())
    if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())

    const created = await prisma.cSActivity.create({ data: parsed.data })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
