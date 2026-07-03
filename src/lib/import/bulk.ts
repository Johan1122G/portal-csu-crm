// ─── Import masivo v2 (un solo Excel para TODOS los clientes) ─────────────────────
// Formato ANCHO: una fila por cliente. Las columnas mapean a distintos destinos:
//  - account: campo escalar del cliente
//  - contact: contacto Principal del cliente (pestaña Contactos)
//  - relationship: Ejecutivo de Cuenta (pestaña Relacionamiento)
//  - product: Producto/Servicio contratado (pestaña Productos; Fecha Fin → renovaciones)
//  - matchName/matchNit: identifican al cliente · computed/ignore: no se importan
// Match del cliente por NOMBRE exacto (o NIT). Sin imports de servidor.

import { INDUSTRIAS, TAMANOS_EMPRESA } from "@/lib/constants"

export const TIPOS_SOLUCION = ["Producto", "Licenciamiento", "Servicios"]
export const TIPOS_FACTURACION = ["Mensual", "Bimestral", "Trimestral", "Semestral", "Anual", "Único pago", "Por consumo"]
export const SI_NO = ["Sí", "No"]

export type ColTipo = "text" | "int" | "float" | "boolean" | "date"

export type ColTarget =
  | { kind: "matchName" }
  | { kind: "matchNit" }
  | { kind: "ignore" }
  | { kind: "computed" }
  | { kind: "account"; key: string }
  | { kind: "contact"; key: "fullname" | "jobtitle" | "emailaddress1" | "telephone1" }
  | { kind: "relationship"; role: string }
  | { kind: "product"; key: string }

export type ImportColumn = {
  header: string // encabezado que se escribe/lee en el Excel
  seccion: string
  destino: string // etiqueta legible del destino (para la guía)
  tipo: ColTipo
  target: ColTarget
  ejemplo: string
  opciones?: string[] // lista desplegable en el Excel
}

export const IMPORT_COLUMNS: ImportColumn[] = [
  { header: "ID Cliente", seccion: "Identificación", destino: "Referencia", tipo: "text", target: { kind: "ignore" }, ejemplo: "(opcional)" },
  { header: "Nombre Empresa", seccion: "Identificación", destino: "Cliente (clave)", tipo: "text", target: { kind: "matchName" }, ejemplo: "Universidad de los Andes" },
  { header: "NIT", seccion: "Identificación", destino: "Cliente (clave)", tipo: "text", target: { kind: "matchNit" }, ejemplo: "860.000.000-0" },

  { header: "Sector", seccion: "Información General", destino: "Cliente", tipo: "text", target: { kind: "account", key: "industrycode" }, ejemplo: "Educación", opciones: [...INDUSTRIAS] },
  { header: "Tamaño", seccion: "Información General", destino: "Cliente", tipo: "text", target: { kind: "account", key: "cr_bex_tamanoempresa" }, ejemplo: "Grande (201-1000)", opciones: [...TAMANOS_EMPRESA] },
  { header: "Ciudad", seccion: "Información General", destino: "Cliente", tipo: "text", target: { kind: "account", key: "address1_city" }, ejemplo: "Bogotá, D.C." },
  { header: "País", seccion: "Información General", destino: "Cliente", tipo: "text", target: { kind: "account", key: "address1_country" }, ejemplo: "Colombia" },
  { header: "Sitio Web", seccion: "Información General", destino: "Cliente", tipo: "text", target: { kind: "account", key: "websiteurl" }, ejemplo: "https://www.cliente.com" },

  { header: "Contacto Principal", seccion: "Contacto principal", destino: "Contacto", tipo: "text", target: { kind: "contact", key: "fullname" }, ejemplo: "María Pérez" },
  { header: "Cargo", seccion: "Contacto principal", destino: "Contacto", tipo: "text", target: { kind: "contact", key: "jobtitle" }, ejemplo: "Directora de TI" },
  { header: "Correo", seccion: "Contacto principal", destino: "Contacto", tipo: "text", target: { kind: "contact", key: "emailaddress1" }, ejemplo: "maria.perez@cliente.com" },
  { header: "Teléfono", seccion: "Contacto principal", destino: "Contacto", tipo: "text", target: { kind: "contact", key: "telephone1" }, ejemplo: "+57 300 000 0000" },

  { header: "Ejecutivo Cuenta", seccion: "Relacionamiento", destino: "Ejecutivo (BEXT)", tipo: "text", target: { kind: "relationship", role: "Ejecutivo Comercial" }, ejemplo: "Juan BEXT" },

  { header: "Tipo de solución contratado", seccion: "Contrato", destino: "Producto/Servicio", tipo: "text", target: { kind: "product", key: "cr_bex_lineanegocio" }, ejemplo: "Servicios", opciones: TIPOS_SOLUCION },
  { header: "Alcance contratado", seccion: "Contrato", destino: "Producto/Servicio", tipo: "text", target: { kind: "product", key: "cr_bex_productoservicio" }, ejemplo: "Soporte Managed Services 8x5" },
  { header: "¿Tiene bolsa de horas?", seccion: "Soporte", destino: "Cliente", tipo: "boolean", target: { kind: "account", key: "cr_bex_tienebolsahoras" }, ejemplo: "Sí", opciones: SI_NO },
  { header: "Horas contratadas", seccion: "Soporte", destino: "Cliente", tipo: "int", target: { kind: "account", key: "cr_bex_horascontratadas" }, ejemplo: "1000" },
  { header: "Horas consumidas", seccion: "Soporte", destino: "Cliente", tipo: "int", target: { kind: "account", key: "cr_bex_horasconsumidas" }, ejemplo: "154" },
  { header: "Horas disponibles", seccion: "Soporte", destino: "Calculado (no se importa)", tipo: "int", target: { kind: "computed" }, ejemplo: "846" },

  { header: "Valor Contrato", seccion: "Contrato", destino: "Producto/Servicio", tipo: "float", target: { kind: "product", key: "cr_bex_valorcontrato" }, ejemplo: "120000000" },
  { header: "Tipo de facturación", seccion: "Contrato", destino: "Producto/Servicio", tipo: "text", target: { kind: "product", key: "cr_bex_tipofacturacion" }, ejemplo: "Mensual", opciones: TIPOS_FACTURACION },
  { header: "Fecha Inicio", seccion: "Contrato", destino: "Producto/Servicio", tipo: "date", target: { kind: "product", key: "activeon" }, ejemplo: "2025-01-01" },
  { header: "Fecha Fin", seccion: "Contrato", destino: "Producto/Servicio (→ renovaciones)", tipo: "date", target: { kind: "product", key: "expireson" }, ejemplo: "2026-01-01" },

  { header: "Riesgos identificados", seccion: "Conocimiento", destino: "Cliente", tipo: "text", target: { kind: "account", key: "cr_bex_riesgosidentificados" }, ejemplo: "Dependencia de un único técnico interno" },
  { header: "NPS", seccion: "Métricas (manual)", destino: "Cliente", tipo: "int", target: { kind: "account", key: "cr_bex_nps" }, ejemplo: "40" },
  { header: "CSAT", seccion: "Métricas (manual)", destino: "Cliente (manual)", tipo: "float", target: { kind: "account", key: "cr_bex_csatmanual" }, ejemplo: "4.5" },
  { header: "Cumplimiento SLA %", seccion: "Métricas (manual)", destino: "Cliente (manual)", tipo: "int", target: { kind: "account", key: "cr_bex_slacumplimiento" }, ejemplo: "95" },
  { header: "Oportunidades Upsell/Cross-sell", seccion: "Customer Success", destino: "Cliente", tipo: "text", target: { kind: "account", key: "cr_bex_oportunidades" }, ejemplo: "Interés en Power BI" },
  { header: "Última Interacción", seccion: "Métricas (manual)", destino: "Cliente (manual)", tipo: "date", target: { kind: "account", key: "cr_bex_ultimainteraccion" }, ejemplo: "2026-06-30" },
  { header: "Caso de Éxito", seccion: "Customer Success", destino: "Cliente", tipo: "boolean", target: { kind: "account", key: "cr_bex_casoexito" }, ejemplo: "No", opciones: SI_NO },
  { header: "Observaciones", seccion: "Observaciones", destino: "Cliente", tipo: "text", target: { kind: "account", key: "description" }, ejemplo: "Renovación en julio 2026" },
]

// Normaliza encabezados/nombres: sin acentos, minúsculas, sin espacios extra.
export function normHeader(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

// Aliases para las columnas de identificación (por si el archivo usa otros nombres).
const NAME_ALIASES = ["nombre empresa", "razon social", "nombre", "cliente"].map(normHeader)
const NIT_ALIASES = ["nit", "accountnumber", "numero de cuenta"].map(normHeader)

const BY_NORM = new Map<string, ImportColumn>()
for (const c of IMPORT_COLUMNS) BY_NORM.set(normHeader(c.header), c)
const NAME_COL = IMPORT_COLUMNS.find((c) => c.target.kind === "matchName")!
const NIT_COL = IMPORT_COLUMNS.find((c) => c.target.kind === "matchNit")!

export function resolveHeader(header: string): ImportColumn | null {
  const n = normHeader(header)
  const direct = BY_NORM.get(n)
  if (direct) return direct
  if (NAME_ALIASES.includes(n)) return NAME_COL
  if (NIT_ALIASES.includes(n)) return NIT_COL
  return null
}

// El texto guía de celdas vacías (el import lo ignora).
export const PLACEHOLDER_VALOR = "✏️ Edita esta celda"
export function esPlaceholder(v: string | undefined): boolean {
  const t = (v ?? "").trim()
  return t === "" || t.startsWith("✏️") || /^edita esta celda/i.test(t)
}

// Coacciona un valor de texto al tipo de la columna. undefined = vacío/ inválido → no toca.
export function coerceCol(tipo: ColTipo, raw: string): string | number | boolean | Date | undefined {
  const v = (raw ?? "").trim()
  if (v === "") return undefined
  switch (tipo) {
    case "int": {
      const n = toNumber(v)
      return n == null ? undefined : Math.round(n)
    }
    case "float": {
      const n = toNumber(v)
      return n == null ? undefined : n
    }
    case "boolean": {
      if (/^(s[íi]|si|true|1|x|y|yes)$/i.test(v)) return true
      if (/^(no|false|0|n)$/i.test(v)) return false
      return undefined
    }
    case "date": {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
      const d = m ? new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`) : new Date(v)
      return isNaN(d.getTime()) ? undefined : d
    }
    default:
      return v
  }
}

// Parsea número tolerando símbolos de moneda y separadores de miles (formato es-CO).
function toNumber(v: string): number | null {
  let s = v.replace(/[^\d.,-]/g, "")
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".") // "1.000.000,50" → "1000000.50"
  const n = parseFloat(s)
  return isFinite(n) ? n : null
}

// Formatea el valor actual para prellenar la plantilla.
export function formatForTemplate(tipo: ColTipo, value: unknown): string {
  if (value == null) return ""
  if (tipo === "boolean") return value ? "Sí" : "No"
  if (tipo === "date") return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
  return String(value)
}
