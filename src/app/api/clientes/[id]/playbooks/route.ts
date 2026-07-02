import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { addDays } from "date-fns"
import { auth } from "@/lib/auth"
import { requireSession, badRequest, serverError } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { getPlaybookTemplate } from "@/lib/playbooks/templates"

type Params = { params: { id: string } }

const bodySchema = z.object({
  plantilla: z.string().min(1),
  motivo: z.string().nullish(),
})

// POST — aplica un playbook (plantilla) al cliente: crea un PlaybookRun y sus
// tareas con fechas límite calculadas a partir de hoy.
export async function POST(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const cliente = await prisma.account.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())

  const tpl = getPlaybookTemplate(parsed.data.plantilla)
  if (!tpl) return badRequest("Playbook no encontrado")

  const session = await auth()
  const createdBy = session?.user?.email ?? null
  const hoy = new Date()

  try {
    const run = await prisma.playbookRun.create({
      data: {
        accountId: params.id,
        plantilla: tpl.key,
        titulo: tpl.titulo,
        motivo: parsed.data.motivo ?? null,
        createdBy,
        tasks: {
          create: tpl.tasks.map((t) => ({
            accountId: params.id,
            titulo: t.titulo,
            detalle: t.detalle ?? null,
            responsable: t.rolSugerido ?? null,
            prioridad: t.prioridad,
            vence: addDays(hoy, t.offsetDias),
            origen: "Playbook",
            createdBy,
          })),
        },
      },
      include: { tasks: { orderBy: [{ vence: "asc" }, { createdon: "asc" }] } },
    })
    return NextResponse.json({ ok: true, run })
  } catch (error) {
    return serverError(error)
  }
}

// DELETE — cancela/elimina un playbook aplicado (y sus tareas via cascade→SetNull).
// Se pasa el runId por query (?runId=). Las tareas quedan huérfanas si se quiere
// conservarlas; aquí las eliminamos junto al run para no dejar residuo.
export async function DELETE(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const runId = req.nextUrl.searchParams.get("runId")
  if (!runId) return badRequest("Falta runId")

  try {
    // Verifica pertenencia al cliente.
    const run = await prisma.playbookRun.findFirst({
      where: { id: runId, accountId: params.id },
      select: { id: true },
    })
    if (!run) return NextResponse.json({ error: "Playbook no encontrado" }, { status: 404 })

    await prisma.$transaction([
      prisma.task.deleteMany({ where: { playbookRunId: runId } }),
      prisma.playbookRun.delete({ where: { id: runId } }),
    ])
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
