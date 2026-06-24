import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError } from "@/lib/api"
import { generateD365CsvBundle } from "@/lib/export/csv-generator"
import { bundleToZip } from "@/lib/export/zip"

// GET /api/clientes/[id]/export — ZIP con los 5 CSVs D365 de un cliente.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const cliente = await prisma.account.findUnique({
      where: { id: params.id },
      include: {
        contacts: true,
        relationships: true,
        products: true,
        activities: true,
        opportunities: true,
      },
    })

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    const zip = await bundleToZip(generateD365CsvBundle([cliente]))
    const filename = `cliente-${cliente.accountnumber}-d365.zip`

    return new NextResponse(zip, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return serverError(error)
  }
}
