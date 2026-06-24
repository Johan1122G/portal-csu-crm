import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError, badRequest } from "@/lib/api"
import { createClienteSchema } from "@/lib/validation"

// GET /api/clientes — lista paginada con filtros.
// Query params: estado, industria, estrategico, search, page, limit
export async function GET(req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const { searchParams } = req.nextUrl
    const estado = searchParams.get("estado") ?? undefined
    const industria = searchParams.get("industria") ?? undefined
    const estrategico = searchParams.get("estrategico")
    const search = searchParams.get("search")?.trim()
    const page = Math.max(1, Number(searchParams.get("page") ?? 1))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)))

    const where: Prisma.AccountWhereInput = {
      ...(estado ? { cr_bex_estadocliente: estado } : {}),
      ...(industria ? { industrycode: industria } : {}),
      ...(estrategico === "true" ? { cr_bex_clienteestrategico: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { accountnumber: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      prisma.account.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          accountnumber: true,
          cr_bex_estadocliente: true,
          industrycode: true,
          address1_city: true,
          cr_bex_clienteestrategico: true,
          cr_bex_nivelsatisfaccion: true,
        },
      }),
      prisma.account.count({ where }),
    ])

    return NextResponse.json({ data, total, page, limit })
  } catch (error) {
    return serverError(error)
  }
}

// POST /api/clientes — crea Account + Contacts + BextRelationships en una transacción.
export async function POST(req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const body = await req.json()
    const parsed = createClienteSchema.safeParse(body)
    if (!parsed.success) {
      return badRequest("Datos inválidos", parsed.error.flatten())
    }

    const { contacts, relationships, ...account } = parsed.data

    // NIT único — verificación previa para dar un error claro.
    const existing = await prisma.account.findUnique({
      where: { accountnumber: account.accountnumber },
      select: { id: true },
    })
    if (existing) {
      return badRequest(`Ya existe un cliente con el NIT ${account.accountnumber}`)
    }

    const created = await prisma.account.create({
      data: {
        ...account,
        contacts: contacts.length ? { create: contacts } : undefined,
        relationships: relationships.length ? { create: relationships } : undefined,
      },
      select: { id: true, name: true, accountnumber: true },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
