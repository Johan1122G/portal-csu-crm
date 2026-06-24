import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireSession, badRequest, serverError } from "@/lib/api"
import { fetchClientTickets } from "@/lib/glpi/client"

type Params = { params: { id: string } }

async function getAccountGlpi(accountId: string) {
  return prisma.account.findUnique({
    where: { id: accountId },
    select: { cr_bex_glpientityid: true, cr_bex_glpiticketsincluidos: true },
  })
}

// Parsea el JSON de IDs incluidos guardado en el cliente; tolera valor nulo/corrupto.
function parseIncluidos(raw: string | null | undefined): number[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.map(Number).filter((n) => Number.isFinite(n)) : []
  } catch {
    return []
  }
}

// GET /api/clientes/[id]/tickets — lista completa de tickets del cliente desde GLPI
// (total, horas histórico, abiertos/cerrados, tickets) + selección persistida.
export async function GET(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const acc = await getAccountGlpi(params.id)
  if (!acc) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  if (!acc.cr_bex_glpientityid) {
    return badRequest("Este cliente no está vinculado a una entidad de GLPI. Sincronízalo desde GLPI primero.")
  }

  try {
    const stats = await fetchClientTickets(acc.cr_bex_glpientityid)
    return NextResponse.json({ ...stats, incluidos: parseIncluidos(acc.cr_bex_glpiticketsincluidos) })
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Error consultando tickets en GLPI")
  }
}

const applySchema = z.object({
  ticketIds: z.array(z.number().int()),
})

// POST /api/clientes/[id]/tickets — aplica las horas consumidas como la suma del
// actiontime SOLO de los tickets seleccionados, y persiste la selección para
// poder reabrirla. La suma se recalcula server-side desde GLPI (no se confía en
// el valor del cliente).
export async function POST(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const acc = await getAccountGlpi(params.id)
  if (!acc) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  if (!acc.cr_bex_glpientityid) return badRequest("Este cliente no está vinculado a una entidad de GLPI.")

  const parsed = applySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest("Cuerpo inválido: se espera { ticketIds: number[] }")
  const seleccion = new Set(parsed.data.ticketIds)

  try {
    const stats = await fetchClientTickets(acc.cr_bex_glpientityid)
    const horasSeleccionadas = stats.tickets
      .filter((t) => seleccion.has(t.id))
      .reduce((sum, t) => sum + t.horas, 0)
    const horas = Math.round(horasSeleccionadas) // el campo es entero

    await prisma.account.update({
      where: { id: params.id },
      data: {
        cr_bex_horasconsumidas: horas,
        cr_bex_glpiticketsincluidos: JSON.stringify(parsed.data.ticketIds),
      },
    })
    return NextResponse.json({ ok: true, cr_bex_horasconsumidas: horas, incluidos: parsed.data.ticketIds })
  } catch (error) {
    return serverError(error)
  }
}
