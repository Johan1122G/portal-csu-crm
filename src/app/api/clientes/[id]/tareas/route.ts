import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { requireSession, badRequest, serverError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

type Params = { params: { id: string } }

// GET — tareas del cliente + playbooks aplicados (con sus tareas agrupadas).
export async function GET(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const [tasks, runs] = await Promise.all([
      prisma.task.findMany({
        where: { accountId: params.id },
        orderBy: [{ estado: "asc" }, { vence: "asc" }, { createdon: "desc" }],
      }),
      prisma.playbookRun.findMany({
        where: { accountId: params.id },
        orderBy: { createdon: "desc" },
        include: { tasks: { orderBy: [{ vence: "asc" }, { createdon: "asc" }] } },
      }),
    ])
    return NextResponse.json({ tasks, runs })
  } catch (error) {
    return serverError(error)
  }
}

// Una tarea a crear (usada para creación manual o para aprobar acciones sugeridas
// por IA en lote).
const taskInput = z.object({
  titulo: z.string().min(1),
  detalle: z.string().nullish(),
  responsable: z.string().nullish(),
  prioridad: z.enum(["Alta", "Media", "Baja"]).nullish(),
  vence: z.string().nullish(), // ISO o YYYY-MM-DD
  origen: z.enum(["Manual", "IA", "Playbook"]).default("Manual"),
})

const bodySchema = z.union([
  taskInput, // una sola tarea
  z.object({ tasks: z.array(taskInput).min(1) }), // lote (aprobar sugerencias)
])

function parseVence(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T12:00:00` : s)
  return isNaN(d.getTime()) ? null : d
}

// POST — crea una tarea o un lote de tareas (aprobar sugerencias de IA).
export async function POST(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const cliente = await prisma.account.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())

  const session = await auth()
  const createdBy = session?.user?.email ?? null
  const items = "tasks" in parsed.data ? parsed.data.tasks : [parsed.data]

  try {
    await prisma.task.createMany({
      data: items.map((t) => ({
        accountId: params.id,
        titulo: t.titulo,
        detalle: t.detalle ?? null,
        responsable: t.responsable ?? null,
        prioridad: t.prioridad ?? null,
        vence: parseVence(t.vence),
        origen: t.origen,
        createdBy,
      })),
    })
    const tasks = await prisma.task.findMany({
      where: { accountId: params.id },
      orderBy: [{ estado: "asc" }, { vence: "asc" }, { createdon: "desc" }],
    })
    return NextResponse.json({ ok: true, creadas: items.length, tasks })
  } catch (error) {
    return serverError(error)
  }
}
