import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError } from "@/lib/api"
import { generateD365CsvBundle } from "@/lib/export/csv-generator"
import { bundleToZip } from "@/lib/export/zip"

// GET /api/clientes/export — ZIP con los 5 CSVs D365 de TODOS los clientes.
// (Segmento estático: Next lo resuelve antes que /api/clientes/[id].)
export async function GET() {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const clientes = await prisma.account.findMany({
      orderBy: { name: "asc" },
      include: {
        contacts: true,
        relationships: true,
        products: true,
        activities: true,
        opportunities: true,
      },
    })

    const zip = await bundleToZip(generateD365CsvBundle(clientes))

    return new NextResponse(zip, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="bex-crm-d365-export.zip"`,
      },
    })
  } catch (error) {
    return serverError(error)
  }
}
