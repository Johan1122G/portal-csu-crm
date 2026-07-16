import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"
import { requireSession, serverError } from "@/lib/api"
import { IMPORT_COLUMNS, formatForTemplate, ENTREGABLE_COLUMNS, ENTREGABLE_SHEET, type ImportColumn } from "@/lib/import/bulk"

export const dynamic = "force-dynamic"

type AcctFull = Awaited<ReturnType<typeof loadAccounts>>[number]

async function loadAccounts() {
  return prisma.account.findMany({
    orderBy: { name: "asc" },
    include: {
      contacts: { where: { cr_bex_tipocontacto: "Principal" }, take: 1, orderBy: { createdon: "asc" } },
      relationships: { where: { cr_bex_rolbext: "Ejecutivo Comercial" }, take: 1, orderBy: { createdon: "asc" } },
      products: { take: 1, orderBy: { createdon: "desc" } },
    },
  })
}

// Valor actual del cliente para una columna, según su destino.
function valueFor(col: ImportColumn, a: AcctFull): string {
  const t = col.target
  const contact = a.contacts[0]
  const rel = a.relationships[0]
  const product = a.products[0]
  switch (t.kind) {
    case "matchName":
      return a.name
    case "matchNit":
      return a.accountnumber
    case "ignore":
      return ""
    case "computed": {
      const c = a.cr_bex_horascontratadas
      const u = a.cr_bex_horasconsumidas
      return c != null && u != null ? String(c - u) : ""
    }
    case "account":
      return formatForTemplate(col.tipo, (a as Record<string, unknown>)[t.key])
    case "contact":
      return contact ? String((contact as Record<string, unknown>)[t.key] ?? "") : ""
    case "relationship":
      return rel?.cr_bex_nombrepersona ?? ""
    case "product":
      return product ? formatForTemplate(col.tipo, (product as Record<string, unknown>)[t.key]) : ""
  }
}

// GET /api/clientes/importar/plantilla — Excel con una fila por cliente, valores
// actuales precargados y listas desplegables donde aplica.
export async function GET(_req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  try {
    const clientes = await loadAccounts()

    const wb = new ExcelJS.Workbook()
    wb.created = new Date()
    const ws = wb.addWorksheet("Clientes", { views: [{ state: "frozen", ySplit: 1, xSplit: 2 }] })

    ws.columns = IMPORT_COLUMNS.map((c) => ({
      header: c.header,
      key: c.header,
      width: c.tipo === "text" && c.seccion !== "Identificación" ? 26 : 20,
    }))

    // Encabezado: negrita + nota de ayuda (destino, formato/opciones, ejemplo).
    const headerRow = ws.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { vertical: "middle", wrapText: true }
    IMPORT_COLUMNS.forEach((c, i) => {
      const cell = headerRow.getCell(i + 1)
      const partes = [
        `Sección: ${c.seccion}`,
        `Destino: ${c.destino}`,
        c.opciones ? `Opciones: ${c.opciones.join(" · ")}` : `Formato: ${c.tipo}`,
        `Ejemplo: ${c.ejemplo}`,
      ]
      cell.note = partes.join("\n")
    })

    // Filas por cliente.
    for (const a of clientes) {
      const row: Record<string, string> = {}
      for (const c of IMPORT_COLUMNS) row[c.header] = valueFor(c, a)
      ws.addRow(row)
    }

    // Listas desplegables (data validation) en las columnas con opciones.
    const lastRow = clientes.length + 1
    IMPORT_COLUMNS.forEach((c, i) => {
      if (!c.opciones || lastRow < 2) return
      const colLetter = ws.getColumn(i + 1).letter
      const formulae = [`"${c.opciones.join(",")}"`]
      for (let r = 2; r <= lastRow; r++) {
        ws.getCell(`${colLetter}${r}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae,
          showErrorMessage: false, // permite dejar valores previos aunque no estén en la lista
        }
      }
    })

    // ── Hoja 2: Entregables (valor agregado) ──────────────────────────────────
    const ws2 = wb.addWorksheet(ENTREGABLE_SHEET, { views: [{ state: "frozen", ySplit: 1 }] })
    ws2.columns = ENTREGABLE_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.key === "nombre" ? 30 : 20 }))
    const h2 = ws2.getRow(1)
    h2.font = { bold: true }
    ENTREGABLE_COLUMNS.forEach((c, i) => {
      const partes = [c.opciones ? `Opciones: ${c.opciones.join(" · ")}` : `Formato: ${c.tipo}`, `Ejemplo: ${c.ejemplo}`]
      h2.getCell(i + 1).note = partes.join("\n")
    })

    const entregables = await prisma.deliverable.findMany({
      include: { account: { select: { name: true, accountnumber: true } } },
      orderBy: [{ account: { name: "asc" } }, { nombre: "asc" }],
    })
    for (const d of entregables) {
      ws2.addRow({
        cliente: d.account.name,
        nit: d.account.accountnumber,
        nombre: d.nombre,
        categoria: d.categoria ?? "",
        frecuencia: d.frecuencia,
        responsable: d.responsable ?? "",
        proximaEntrega: d.proximaEntrega ? d.proximaEntrega.toISOString().slice(0, 10) : "",
        notificarDiasAntes: String(d.notificarDiasAntes),
      })
    }
    // Dropdowns en la hoja de entregables (buffer de filas para agregar nuevos).
    const filas2 = Math.max(entregables.length + 1, 200)
    ENTREGABLE_COLUMNS.forEach((c, i) => {
      if (!c.opciones) return
      const letter = ws2.getColumn(i + 1).letter
      for (let r = 2; r <= filas2; r++) {
        ws2.getCell(`${letter}${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`"${c.opciones.join(",")}"`], showErrorMessage: false }
      }
    })

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
