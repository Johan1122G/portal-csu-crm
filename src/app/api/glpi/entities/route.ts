import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession, badRequest } from "@/lib/api"
import { fetchGlpiEntities } from "@/lib/glpi/client"
import { accountNumberFor, isClientEntity } from "@/lib/glpi/mapper"

// GET /api/glpi/entities — trae las entidades de GLPI y marca cuáles ya existen
// en el CRM (preview para que el usuario elija qué importar/actualizar).
export async function GET() {
  const unauth = await requireSession()
  if (unauth) return unauth

  let entities
  try {
    entities = await fetchGlpiEntities()
  } catch (error) {
    // Config faltante o GLPI inaccesible → 400 con mensaje legible para la UI.
    return badRequest(error instanceof Error ? error.message : "Error consultando GLPI")
  }

  // Solo entidades que cuelgan de "Clientes Bext" (excluye raíz y unidades internas).
  entities = entities.filter(isClientEntity)

  const existing = await prisma.account.findMany({
    select: { id: true, name: true, cr_bex_glpientityid: true, accountnumber: true },
  })
  const byGlpiId = new Map(existing.filter((a) => a.cr_bex_glpientityid).map((a) => [a.cr_bex_glpientityid!, a]))
  const byAccountNumber = new Map(existing.map((a) => [a.accountnumber, a]))

  const data = entities.map((e) => {
    const accountnumber = accountNumberFor(e)
    const match = byGlpiId.get(String(e.id)) ?? byAccountNumber.get(accountnumber)
    return {
      glpiId: String(e.id),
      name: e.name,
      registration_number: e.registration_number ?? "",
      accountnumber,
      town: e.town ?? "",
      website: e.website ?? "",
      exists: !!match,
      existingAccountId: match?.id ?? null,
    }
  })

  return NextResponse.json({ data, total: data.length })
}
