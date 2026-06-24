import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession, badRequest, serverError } from "@/lib/api"
import { updateOpportunitySchema } from "@/lib/validation"

type Params = { params: { id: string } }

// "" → null (limpiar); undefined → no tocar.
const clean = (v: string | undefined): string | null | undefined =>
  v === undefined ? undefined : v.trim() === "" ? null : v

// PUT /api/oportunidades/[id] — edita una oportunidad.
export async function PUT(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const exists = await prisma.opportunityRecommendation.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 404 })

  const parsed = updateOpportunitySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten())
  const b = parsed.data

  const fecha = b.estimatedclosedate
  const estimatedclosedate = fecha === undefined ? undefined : fecha.trim() === "" ? null : new Date(fecha)

  try {
    const updated = await prisma.opportunityRecommendation.update({
      where: { id: params.id },
      data: {
        name: b.name,
        cr_bex_origen: b.cr_bex_origen || "Gestión CS",
        cr_bex_tipo: clean(b.cr_bex_tipo),
        cr_bex_impacto: clean(b.cr_bex_impacto),
        prioritycode: clean(b.prioritycode),
        cr_bex_responsable: clean(b.cr_bex_responsable),
        cr_bex_accionrequerida: clean(b.cr_bex_accionrequerida),
        estimatedclosedate,
        statecode: b.statecode || "Pendiente",
        serviceCatalogItemId: clean(b.serviceCatalogItemId),
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    return serverError(error)
  }
}

// DELETE /api/oportunidades/[id] — elimina una oportunidad.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    await prisma.opportunityRecommendation.deleteMany({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}
