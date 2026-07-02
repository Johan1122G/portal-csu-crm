import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import Papa from "papaparse"
import { prisma } from "@/lib/prisma"
import { requireSession, badRequest, serverError } from "@/lib/api"
import { coerceValue, esPlaceholder } from "@/lib/import/clientFields"
import { normHeader, resolveHeader } from "@/lib/import/bulk"

export const dynamic = "force-dynamic"

// Convierte el valor de una celda de exceljs a texto plano (maneja fechas, fórmulas
// y rich-text que exceljs devuelve como objetos).
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

// Lee el archivo subido (.xlsx o .csv) → { headers, rows } como strings.
async function readGrid(file: File): Promise<{ headers: string[]; rows: string[][] }>
{
  const name = file.name.toLowerCase()
  if (name.endsWith(".csv")) {
    const text = await file.text()
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true })
    const all = parsed.data as string[][]
    return { headers: (all[0] ?? []).map((h) => (h ?? "").toString()), rows: all.slice(1) }
  }
  // .xlsx (default)
  const buf = Buffer.from(await file.arrayBuffer())
  const wb = new ExcelJS.Workbook()
  // Cast: los @types de exceljs esperan un Buffer no-genérico.
  await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0])
  const ws = wb.worksheets[0]
  if (!ws) return { headers: [], rows: [] }
  const headerVals = (ws.getRow(1).values as unknown[]).slice(1) // index 0 va vacío
  const headers = headerVals.map(cellText)
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
  filasSinCambios: number
  noEncontrados: string[]
  ambiguos: string[]
  detalle: { cliente: string; campos: number }[]
}

// POST /api/clientes/importar — carga masiva desde un único Excel (una fila por
// cliente). Match por NIT (si viene) o por NOMBRE exacto (Razón Social). Semántica
// "rellenar": celdas vacías no borran; nombres/NIT no encontrados se omiten y reportan.
export async function POST(req: NextRequest) {
  const unauth = await requireSession()
  if (unauth) return unauth

  let file: File | null = null
  try {
    const form = await req.formData()
    const f = form.get("file")
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

  // Mapea columnas por su encabezado.
  let nombreIdx = -1
  let nitIdx = -1
  const fieldCols: { idx: number; accountKey: string; field: ReturnType<typeof resolveHeader> }[] = []
  grid.headers.forEach((h, i) => {
    const r = resolveHeader(h)
    if (r.kind === "name") nombreIdx = i
    else if (r.kind === "nit") nitIdx = i
    else if (r.kind === "field") fieldCols.push({ idx: i, accountKey: r.field.accountKey, field: r })
  })

  if (nombreIdx === -1 && nitIdx === -1) {
    return badRequest("La plantilla debe incluir una columna 'Razón Social' o 'NIT' para identificar al cliente.")
  }
  if (fieldCols.length === 0) {
    return badRequest("No se reconoció ninguna columna de datos. Usa la plantilla descargable.")
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
      filasSinCambios: 0,
      noEncontrados: [],
      ambiguos: [],
      detalle: [],
    }

    for (const row of grid.rows) {
      const nombre = (nombreIdx >= 0 ? row[nombreIdx] : "")?.trim() ?? ""
      const nit = (nitIdx >= 0 ? row[nitIdx] : "")?.trim() ?? ""
      if (!nombre && !nit) continue // fila en blanco

      // Resolver cliente: primero por NIT (más preciso), luego por nombre exacto.
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

      // Recolectar los campos con valor válido (no vacío, no placeholder).
      const data: Record<string, unknown> = {}
      for (const col of fieldCols) {
        if (col.field.kind !== "field") continue
        const raw = row[col.idx] ?? ""
        if (esPlaceholder(raw)) continue
        const value = coerceValue(col.field.field, raw)
        if (value === undefined) continue
        data[col.accountKey] = value
      }

      const n = Object.keys(data).length
      if (n === 0) {
        res.filasSinCambios++
        continue
      }
      await prisma.account.update({ where: { id: cuenta.id }, data })
      res.clientesActualizados++
      res.camposAplicados += n
      res.detalle.push({ cliente: cuenta.name, campos: n })
    }

    return NextResponse.json({ ok: true, ...res })
  } catch (error) {
    return serverError(error)
  }
}
