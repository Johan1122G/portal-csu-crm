import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError } from "@/lib/api"
import { CLIENT_IMPORT_FIELDS, FIELD_OPCIONES, formatForTemplate } from "@/lib/import/clientFields"
import { COL_NOMBRE, COL_NIT } from "@/lib/import/bulk"

export const dynamic = "force-dynamic"

// GET /api/clientes/importar/plantilla — Excel (.xlsx) con UNA fila por cliente y
// una columna por campo importable. Trae los valores actuales para editar en sitio.
// El equipo llena las celdas; una celda vacía NO borra el dato existente.
export async function GET(_req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const clientes = await prisma.account.findMany({ orderBy: { name: "asc" } })

    const wb = new ExcelJS.Workbook()
    wb.created = new Date()
    const ws = wb.addWorksheet("Clientes", { views: [{ state: "frozen", ySplit: 1, xSplit: 1 }] })

    // Columnas: identificación + un campo por cada importable.
    ws.columns = [
      { header: COL_NOMBRE, key: "__nombre", width: 34 },
      { header: COL_NIT, key: "__nit", width: 16 },
      ...CLIENT_IMPORT_FIELDS.map((f) => ({ header: f.etiqueta, key: f.campo, width: 24 })),
    ]

    // Estilo + notas de ayuda en el encabezado (formato/opciones, ejemplo, equipo).
    const headerRow = ws.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { vertical: "middle", wrapText: true }
    CLIENT_IMPORT_FIELDS.forEach((f, i) => {
      const cell = headerRow.getCell(i + 3) // +3: tras Nombre y NIT
      const opciones = FIELD_OPCIONES[f.campo] ?? "Texto libre"
      cell.note = `${f.seccion}\nEquipo: ${f.equipo}\nFormato: ${opciones}\nEjemplo: ${f.ejemplo}`
    })

    // Una fila por cliente con sus valores actuales (vacío si no hay dato).
    for (const c of clientes) {
      const row: Record<string, string> = {
        __nombre: c.name,
        __nit: c.accountnumber,
      }
      for (const f of CLIENT_IMPORT_FIELDS) {
        row[f.campo] = formatForTemplate(f, (c as Record<string, unknown>)[f.accountKey])
      }
      ws.addRow(row)
    }

    // Congela ancho de las columnas de identificación resaltándolas.
    ws.getColumn(1).font = { bold: true }

    const buffer = await wb.xlsx.writeBuffer()
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="plantilla-clientes-masivo.xlsx"',
      },
    })
  } catch (error) {
    return serverError(error)
  }
}
