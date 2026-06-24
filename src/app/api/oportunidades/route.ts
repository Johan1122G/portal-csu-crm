import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError, badRequest } from "@/lib/api"
import { opportunitySchema } from "@/lib/validation"

// GET /api/oportunidades — todas las oportunidades (global), con nombre de cliente.
// Filtros: tipo, impacto, prioridad, estado, accountId
export async function GET(req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const { searchParams } = req.nextUrl
    const tipo = searchParams.get("tipo") ?? undefined
    const impacto = searchParams.get("impacto") ?? undefined
    const prioridad = searchParams.get("prioridad") ?? undefined
    const estado = searchParams.get("estado") ?? undefined
    const accountId = searchParams.get("accountId") ?? undefined

    const where: Prisma.OpportunityRecommendationWhereInput = {
      ...(tipo ? { cr_bex_tipo: tipo } : {}),
      ...(impacto ? { cr_bex_impacto: impacto } : {}),
      ...(prioridad ? { prioritycode: prioridad } : {}),
      ...(estado ? { statecode: estado } : {}),
      ...(accountId ? { accountId } : {}),
    }

    const data = await prisma.opportunityRecommendation.findMany({
      where,
      orderBy: { createdon: "desc" },
      take: 200,
      include: {
        account: { select: { id: true, name: true } },
        serviceCatalogItem: { select: { nombre: true, unidad: true } },
      },
    })
    return NextResponse.json({ data })
  } catch (error) {
    return serverError(error)
  }
}

// POST /api/oportunidades — registra una oportunidad / recomendación.
export async function POST(req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const parsed = opportunitySchema.safeParse(await req.json())
    if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())

    const created = await prisma.opportunityRecommendation.create({ data: parsed.data })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
