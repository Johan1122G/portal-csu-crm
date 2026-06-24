import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError, badRequest } from "@/lib/api"
import { CATALOG_DEFAULTS } from "@/lib/constants"

const VALID_KEYS = new Set(Object.keys(CATALOG_DEFAULTS))

// GET /api/catalogos          → { data: { KEY: ["valor", ...] } } solo activos (para forms)
// GET /api/catalogos?admin=1  → { data: Catalog[] } todos los registros (para administración)
export async function GET(req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const admin = req.nextUrl.searchParams.get("admin") === "1"
    if (admin) {
      const data = await prisma.catalog.findMany({
        orderBy: [{ key: "asc" }, { sortOrder: "asc" }, { value: "asc" }],
      })
      return NextResponse.json({ data })
    }

    const rows = await prisma.catalog.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
      select: { key: true, value: true },
    })
    const grouped: Record<string, string[]> = {}
    for (const r of rows) {
      ;(grouped[r.key] ??= []).push(r.value)
    }
    return NextResponse.json({ data: grouped })
  } catch (error) {
    return serverError(error)
  }
}

const createSchema = z.object({
  key: z.string().min(1),
  value: z.string().trim().min(1, "Valor requerido"),
})

// POST /api/catalogos — agrega un valor a una lista (reactiva si existía inactivo).
export async function POST(req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const parsed = createSchema.safeParse(await req.json())
    if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())
    const { key, value } = parsed.data
    if (!VALID_KEYS.has(key)) return badRequest("Catálogo desconocido")

    const max = await prisma.catalog.aggregate({ where: { key }, _max: { sortOrder: true } })
    const created = await prisma.catalog.upsert({
      where: { key_value: { key, value } },
      update: { active: true },
      create: { key, value, sortOrder: (max._max.sortOrder ?? 0) + 1 },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
