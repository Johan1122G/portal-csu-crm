import { NextRequest, NextResponse } from "next/server"
import Papa from "papaparse"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireSession, badRequest, serverError } from "@/lib/api"
import { FIELD_BY_CAMPO, coerceValue, esPlaceholder } from "@/lib/import/clientFields"

type Params = { params: { id: string } }

const bodySchema = z.object({ csv: z.string().min(1, "El archivo está vacío") })

type Row = { campo?: string; valor?: string }

// POST /api/clientes/[id]/import — recibe el CSV de la plantilla diligenciada y
// actualiza los campos de contexto del cliente. Semántica "rellenar": solo los
// valores no vacíos sobreescriben (un campo en blanco no borra lo existente).
export async function POST(req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest("Cuerpo inválido: se espera { csv }")

  const exists = await prisma.account.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })

  const result = Papa.parse<Row>(parsed.data.csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  })
  if (!result.meta.fields?.includes("campo") || !result.meta.fields?.includes("valor")) {
    return badRequest("El CSV debe tener las columnas 'campo' y 'valor' (usa la plantilla descargable).")
  }

  const data: Record<string, unknown> = {}
  const ignorados: { campo: string; motivo: string }[] = []
  const aplicadosSet = new Set<string>()
  let duplicados = 0

  // Resiliente a duplicados: si un campo aparece varias veces, gana el ÚLTIMO
  // valor no vacío (un duplicado vacío no pisa lo ya leído).
  for (const row of result.data) {
    const campo = (row.campo ?? "").trim()
    if (!campo) continue
    const field = FIELD_BY_CAMPO[campo]
    if (!field) {
      ignorados.push({ campo, motivo: "campo desconocido" })
      continue
    }
    if (esPlaceholder(row.valor)) continue // celda sin diligenciar (texto guía) → no se toca
    const value = coerceValue(field, row.valor ?? "")
    if (value === undefined) continue // vacío o inválido → no se toca
    if (field.accountKey in data) duplicados++ // ya venía un valor para este campo
    data[field.accountKey] = value
    aplicadosSet.add(field.campo)
  }

  const aplicados = Array.from(aplicadosSet)
  if (aplicados.length === 0) {
    return NextResponse.json({ ok: true, aplicados: [], ignorados, duplicados, message: "No había valores nuevos para aplicar." })
  }

  try {
    await prisma.account.update({ where: { id: params.id }, data })
    return NextResponse.json({ ok: true, aplicados, ignorados, duplicados })
  } catch (error) {
    return serverError(error)
  }
}
