// ─── Import masivo (un solo Excel para TODOS los clientes) ───────────────────────
// Formato ANCHO: una fila por cliente. Columnas fijas de identificación
// (Razón Social + NIT) + una columna por cada campo importable (CLIENT_IMPORT_FIELDS).
// El match del cliente se hace por NOMBRE exacto (Razón Social) o, si viene, por NIT.
//
// Sin imports de servidor — seguro para usar también en componentes cliente.

import { CLIENT_IMPORT_FIELDS, type ImportField } from "@/lib/import/clientFields"

// Encabezados de las dos columnas de identificación del cliente.
export const COL_NOMBRE = "Razón Social"
export const COL_NIT = "NIT"

// Normaliza un encabezado/nombre para hacer el match tolerante a acentos, mayúsculas
// y espacios (p. ej. "Razón Social" == "razon social").
export function normHeader(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita marcas diacríticas (acentos)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

const NAME_ALIASES = new Set(["razon social", "nombre", "cliente", "razon social cliente"].map(normHeader))
const NIT_ALIASES = new Set(["nit", "accountnumber", "numero de cuenta"].map(normHeader))

// Índice de campo por encabezado normalizado (acepta la etiqueta o el código `campo`).
const FIELD_BY_NORM = new Map<string, ImportField>()
for (const f of CLIENT_IMPORT_FIELDS) {
  FIELD_BY_NORM.set(normHeader(f.etiqueta), f)
  FIELD_BY_NORM.set(normHeader(f.campo), f)
}

export type HeaderKind =
  | { kind: "name" }
  | { kind: "nit" }
  | { kind: "field"; field: ImportField }
  | { kind: "unknown" }

// Resuelve a qué corresponde una columna del Excel a partir de su encabezado.
export function resolveHeader(header: string): HeaderKind {
  const n = normHeader(header)
  if (NAME_ALIASES.has(n)) return { kind: "name" }
  if (NIT_ALIASES.has(n)) return { kind: "nit" }
  const field = FIELD_BY_NORM.get(n)
  if (field) return { kind: "field", field }
  return { kind: "unknown" }
}

// Orden de columnas de la plantilla: identificación + un campo por cada importable.
export const TEMPLATE_HEADERS: string[] = [COL_NOMBRE, COL_NIT, ...CLIENT_IMPORT_FIELDS.map((f) => f.etiqueta)]
