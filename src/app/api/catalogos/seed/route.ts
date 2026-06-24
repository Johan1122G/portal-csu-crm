import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError } from "@/lib/api"
import { CATALOG_DEFAULTS } from "@/lib/constants"

// POST /api/catalogos/seed — siembra los valores por defecto (idempotente).
// Inserta solo los que falten; no toca los que el CSM ya editó/agregó.
export async function POST() {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const rows: { key: string; value: string; sortOrder: number }[] = []
    for (const [key, values] of Object.entries(CATALOG_DEFAULTS)) {
      values.forEach((value, i) => rows.push({ key, value, sortOrder: i }))
    }
    const result = await prisma.catalog.createMany({ data: rows, skipDuplicates: true })
    return NextResponse.json({ inserted: result.count })
  } catch (error) {
    return serverError(error)
  }
}
