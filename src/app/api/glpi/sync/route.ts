import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireSession, badRequest, serverError } from "@/lib/api"
import { fetchGlpiEntities } from "@/lib/glpi/client"
import {
  accountNumberFor,
  isClientEntity,
  mapEntityToAccountCreate,
  mapEntityToAccountUpdate,
} from "@/lib/glpi/mapper"

const bodySchema = z.object({ glpiIds: z.array(z.coerce.string()).min(1, "Selecciona al menos una entidad") })

// POST /api/glpi/sync — importa/actualiza los clientes desde las entidades GLPI
// seleccionadas. Match por cr_bex_glpientityid, con fallback a accountnumber.
export async function POST(req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())
  const selected = new Set(parsed.data.glpiIds)

  let entities
  try {
    entities = await fetchGlpiEntities()
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Error consultando GLPI")
  }

  const toSync = entities.filter((e) => selected.has(String(e.id)) && isClientEntity(e))

  let created = 0
  let updated = 0
  const errors: { glpiId: string; name: string; error: string }[] = []

  try {
    for (const e of toSync) {
      try {
        // Match por glpientityid, o por accountnumber (entidad ya cargada a mano).
        const existing = await prisma.account.findFirst({
          where: {
            OR: [{ cr_bex_glpientityid: String(e.id) }, { accountnumber: accountNumberFor(e) }],
          },
          select: { id: true },
        })

        if (existing) {
          await prisma.account.update({ where: { id: existing.id }, data: mapEntityToAccountUpdate(e) })
          updated++
        } else {
          await prisma.account.create({ data: mapEntityToAccountCreate(e) })
          created++
        }
      } catch (err) {
        errors.push({
          glpiId: String(e.id),
          name: e.name,
          error: err instanceof Error ? err.message : "Error desconocido",
        })
      }
    }

    return NextResponse.json({ created, updated, errors })
  } catch (error) {
    return serverError(error)
  }
}
