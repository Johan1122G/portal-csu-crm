import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import Papa from "papaparse"
import { prisma } from "@/lib/prisma"
import { requireSession, badRequest, serverError } from "@/lib/api"
import { IMPORT_COLUMNS, resolveHeader, coerceCol, esPlaceholder, normHeader, type ImportColumn } from "@/lib/import/bulk"

export const dynamic = "force-dynamic"

// Valor de celda exceljs → texto plano (fechas, fórmulas, rich text).
function cellText(v: unknown): string {
  if (v == null) return ""
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === "object") {
    const o = v as Record<string, unknown>
    if (typeof o.text === "string") return o.text
    if (o.result != null) return String(o.result)
    if (Array.isArray(o.richText)) return o.richText.map((r) => (r as { text?: string }).text ?? "").join("")
    if (o.hyperlink != null) return String(o.text ?? o.hyperlink)
    return ""
  }
  return String(v)
}

async function readGrid(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  if (file.name.toLowerCase().endsWith(".csv")) {
    const parsed = Papa.parse<string[]>(await file.text(), { skipEmptyLines: true })
    const all = parsed.data as string[][]
    return { headers: (all[0] ?? []).map((h) => (h ?? "").toString()), rows: all.slice(1) }
  }
  const buf = Buffer.from(await file.arrayBuffer())
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0])
  const ws = wb.worksheets[0]
  if (!ws) return { headers: [], rows: [] }
  const headers = (ws.getRow(1).values as unknown[]).slice(1).map(cellText)
  const rows: string[][] = []
  ws.eachRow((row, n) => {
    if (n === 1) return
    const vals = (row.values as unknown[]).slice(1)
    rows.push(headers.map((_, i) => cellText(vals[i])))
  })
  return { headers, rows }
}

type Resultado = {
  clientesActualizados: number
  camposAplicados: number
  contactos: number
  ejecutivos: number
  contratos: number
  filasSinCambios: number
  noEncontrados: string[]
  ambiguos: string[]
}

// POST /api/clientes/importar — carga masiva desde un Excel (una fila por cliente).
export async function POST(req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  let file: File | null = null
  try {
    const f = (await req.formData()).get("file")
    if (f instanceof File) file = f
  } catch {
    return badRequest("Se espera un archivo (multipart/form-data, campo 'file').")
  }
  if (!file) return badRequest("Falta el archivo a importar.")

  let grid: { headers: string[]; rows: string[][] }
  try {
    grid = await readGrid(file)
  } catch {
    return badRequest("No se pudo leer el archivo. Usa la plantilla .xlsx (o un .csv con los mismos encabezados).")
  }

  // Mapea cada columna del archivo a su definición.
  const cols: (ImportColumn | null)[] = grid.headers.map((h) => resolveHeader(h))
  const nombreIdx = cols.findIndex((c) => c?.target.kind === "matchName")
  const nitIdx = cols.findIndex((c) => c?.target.kind === "matchNit")
  if (nombreIdx === -1 && nitIdx === -1) {
    return badRequest("La plantilla debe incluir 'Nombre Empresa' o 'NIT' para identificar al cliente.")
  }

  try {
    const cuentas = await prisma.account.findMany({ select: { id: true, name: true, accountnumber: true } })
    const byNit = new Map(cuentas.map((c) => [c.accountnumber.trim(), c]))
    const byName = new Map<string, typeof cuentas>()
    for (const c of cuentas) {
      const k = normHeader(c.name)
      const list = byName.get(k) ?? []
      list.push(c)
      byName.set(k, list)
    }

    const res: Resultado = {
      clientesActualizados: 0,
      camposAplicados: 0,
      contactos: 0,
      ejecutivos: 0,
      contratos: 0,
      filasSinCambios: 0,
      noEncontrados: [],
      ambiguos: [],
    }

    for (const row of grid.rows) {
      const nombre = (nombreIdx >= 0 ? row[nombreIdx] : "")?.trim() ?? ""
      const nit = (nitIdx >= 0 ? row[nitIdx] : "")?.trim() ?? ""
      if (!nombre && !nit) continue

      let cuenta = nit ? byNit.get(nit) : undefined
      if (!cuenta && nombre) {
        const matches = byName.get(normHeader(nombre)) ?? []
        if (matches.length === 1) cuenta = matches[0]
        else if (matches.length > 1) {
          res.ambiguos.push(nombre)
          continue
        }
      }
      if (!cuenta) {
        res.noEncontrados.push(nombre || nit)
        continue
      }

      // Bucket de valores por destino.
      const accountData: Record<string, unknown> = {}
      const contactData: Record<string, unknown> = {}
      const productData: Record<string, unknown> = {}
      let ejecutivo: string | undefined

      cols.forEach((col, i) => {
        if (!col) return
        const t = col.target
        if (t.kind === "matchName" || t.kind === "matchNit" || t.kind === "ignore" || t.kind === "computed") return
        const raw = row[i] ?? ""
        if (esPlaceholder(raw)) return
        const value = coerceCol(col.tipo, raw)
        if (value === undefined) return
        if (t.kind === "account") accountData[t.key] = value
        else if (t.kind === "contact") contactData[t.key] = value
        else if (t.kind === "product") productData[t.key] = value
        else if (t.kind === "relationship") ejecutivo = String(value)
      })

      let campos = 0

      // 1) Cliente
      if (Object.keys(accountData).length) {
        await prisma.account.update({ where: { id: cuenta.id }, data: accountData })
        campos += Object.keys(accountData).length
      }

      // 2) Contacto Principal (upsert)
      if (Object.keys(contactData).length) {
        const existing = await prisma.contact.findFirst({
          where: { accountId: cuenta.id, cr_bex_tipocontacto: "Principal" },
          select: { id: true },
        })
        if (existing) {
          await prisma.contact.update({ where: { id: existing.id }, data: contactData })
        } else {
          await prisma.contact.create({
            data: {
              accountId: cuenta.id,
              cr_bex_tipocontacto: "Principal",
              fullname: (contactData.fullname as string) ?? "",
              emailaddress1: (contactData.emailaddress1 as string) ?? "",
              jobtitle: (contactData.jobtitle as string) ?? null,
              telephone1: (contactData.telephone1 as string) ?? null,
            },
          })
        }
        res.contactos++
        campos += Object.keys(contactData).length
      }

      // 3) Ejecutivo de cuenta (Relacionamiento, upsert por rol)
      if (ejecutivo) {
        const existing = await prisma.bextRelationship.findFirst({
          where: { accountId: cuenta.id, cr_bex_rolbext: "Ejecutivo Comercial" },
          select: { id: true },
        })
        if (existing) {
          await prisma.bextRelationship.update({ where: { id: existing.id }, data: { cr_bex_nombrepersona: ejecutivo } })
        } else {
          await prisma.bextRelationship.create({
            data: { accountId: cuenta.id, cr_bex_rolbext: "Ejecutivo Comercial", cr_bex_nombrepersona: ejecutivo },
          })
        }
        res.ejecutivos++
        campos += 1
      }

      // 4) Producto/Servicio contratado (upsert; match por línea si viene)
      if (Object.keys(productData).length) {
        const linea = productData.cr_bex_lineanegocio as string | undefined
        const existing = await prisma.productService.findFirst({
          where: { accountId: cuenta.id, ...(linea ? { cr_bex_lineanegocio: linea } : {}) },
          orderBy: { createdon: "desc" },
          select: { id: true },
        })
        if (existing) {
          await prisma.productService.update({ where: { id: existing.id }, data: productData })
        } else {
          await prisma.productService.create({
            data: {
              accountId: cuenta.id,
              title: cuenta.name,
              cr_bex_productoservicio: (productData.cr_bex_productoservicio as string) ?? "(sin especificar)",
              ...productData,
            },
          })
        }
        res.contratos++
        campos += Object.keys(productData).length
      }

      if (campos === 0) res.filasSinCambios++
      else {
        res.clientesActualizados++
        res.camposAplicados += campos
      }
    }

    return NextResponse.json({ ok: true, ...res })
  } catch (error) {
    return serverError(error)
  }
}
