import { NextRequest, NextResponse } from "next/server"
import Papa from "papaparse"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/api"
import { CLIENT_IMPORT_FIELDS, FIELD_OPCIONES, PLACEHOLDER_VALOR, formatForTemplate } from "@/lib/import/clientFields"

type Params = { params: { id: string } }

// GET /api/clientes/[id]/plantilla — CSV con los campos del cliente listos para
// diligenciar (incluye el valor actual y qué equipo llena cada campo). El equipo
// edita la columna "valor" y luego se reimporta.
export async function GET(_req: NextRequest, { params }: Params) {
  const unauth = await requireSession()
  if (unauth) return unauth

  const cliente = await prisma.account.findUnique({ where: { id: params.id } })
  if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })

  const rows = CLIENT_IMPORT_FIELDS.map((f) => {
    const actual = formatForTemplate(f, (cliente as Record<string, unknown>)[f.accountKey])
    const opciones = FIELD_OPCIONES[f.campo]
    return {
      seccion: f.seccion,
      // La etiqueta ya incluye el formato/opciones entre paréntesis.
      etiqueta: opciones ? `${f.etiqueta} (${opciones})` : f.etiqueta,
      campo: f.campo,
      equipo: f.equipo,
      // Valor actual si existe; si no, el texto guía con un ejemplo.
      valor: actual !== "" ? actual : `${PLACEHOLDER_VALOR} (ej: ${f.ejemplo})`,
    }
  })

  // Fila de instrucciones al inicio (campo vacío → la ignora el import).
  const instrucciones = {
    seccion: "↓ INSTRUCCIONES",
    etiqueta: "Diligencia SOLO la columna 'valor' (reemplaza el texto de ejemplo). No borres ni cambies las otras columnas.",
    campo: "",
    equipo: "",
    valor: "",
  }

  const csv = Papa.unparse([instrucciones, ...rows], {
    columns: ["seccion", "etiqueta", "campo", "equipo", "valor"],
  })
  // BOM para que Excel respete los acentos (UTF-8).
  const body = "﻿" + csv

  const safeName = cliente.accountnumber.replace(/[^a-zA-Z0-9_-]/g, "")
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="plantilla-${safeName}.csv"`,
    },
  })
}
