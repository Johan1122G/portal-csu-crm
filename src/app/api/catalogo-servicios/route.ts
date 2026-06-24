import { NextRequest, NextResponse } from "next/server"
import { requireSession, serverError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { SERVICE_CATALOG_SEED } from "@/lib/catalog/serviceCatalogSeed"

// GET /api/catalogo-servicios — catálogo de ofertas de BEXT (para upsell y
// asociación oportunidad→servicio). ?all=1 incluye inactivos.
export async function GET(req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const all = req.nextUrl.searchParams.get("all") === "1"
  const items = await prisma.serviceCatalogItem.findMany({
    where: all ? {} : { activo: true },
    orderBy: [{ unidad: "asc" }, { linea: "asc" }, { nombre: "asc" }],
  })
  return NextResponse.json({ items })
}

// POST /api/catalogo-servicios — siembra/actualiza el catálogo desde el seed
// (idempotente por [unidad, nombre]).
export async function POST() {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    let upserts = 0
    for (const s of SERVICE_CATALOG_SEED) {
      await prisma.serviceCatalogItem.upsert({
        where: { unidad_nombre: { unidad: s.unidad, nombre: s.nombre } },
        create: { ...s, activo: true },
        update: {
          linea: s.linea ?? null,
          nombreCompleto: s.nombreCompleto ?? null,
          categoria: s.categoria ?? null,
          descripcion: s.descripcion ?? null,
        },
      })
      upserts++
    }
    return NextResponse.json({ ok: true, items: upserts })
  } catch (error) {
    return serverError(error)
  }
}
