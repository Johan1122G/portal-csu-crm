// Catálogo de campos importables del cliente (contexto del 360°). Fuente única
// usada por: la plantilla CSV descargable, el parser de import y la guía en la UI
// de qué equipo (Comercial / Técnico) llena cada campo.
//
// Sin imports de servidor — seguro de usar también en componentes cliente.

export type FieldType = "text" | "int" | "boolean" | "date"
export type Equipo = "Comercial" | "Técnico" | "Ambos"

export type ImportField = {
  campo: string // clave estable en el CSV (columna que se lee al importar)
  seccion: string
  etiqueta: string
  equipo: Equipo
  tipo: FieldType
  ejemplo: string // valor de ejemplo (guía de cómo llenar)
  accountKey: string // nombre del campo en el modelo Account (Prisma)
}

export const CLIENT_IMPORT_FIELDS: ImportField[] = [
  // ── Información General (Comercial) ──────────────────────────────────────────
  { campo: "estado_cliente", seccion: "Información General", etiqueta: "Estado del cliente", equipo: "Comercial", tipo: "text", ejemplo: "Activo", accountKey: "cr_bex_estadocliente" },
  { campo: "industria", seccion: "Información General", etiqueta: "Industria", equipo: "Comercial", tipo: "text", ejemplo: "Educación", accountKey: "industrycode" },
  { campo: "tamano_empresa", seccion: "Información General", etiqueta: "Tamaño de empresa", equipo: "Comercial", tipo: "text", ejemplo: "Grande (201-1000)", accountKey: "cr_bex_tamanoempresa" },
  { campo: "ciudad", seccion: "Información General", etiqueta: "Ciudad", equipo: "Comercial", tipo: "text", ejemplo: "Bogotá, D.C.", accountKey: "address1_city" },
  { campo: "pais", seccion: "Información General", etiqueta: "País", equipo: "Comercial", tipo: "text", ejemplo: "Colombia", accountKey: "address1_country" },
  { campo: "sitio_web", seccion: "Información General", etiqueta: "Sitio web", equipo: "Comercial", tipo: "text", ejemplo: "https://www.cliente.com", accountKey: "websiteurl" },
  { campo: "fecha_primer_negocio", seccion: "Información General", etiqueta: "Fecha primer negocio", equipo: "Comercial", tipo: "date", ejemplo: "2021-03-15", accountKey: "cr_bex_primernegocio" },

  // ── Conocimiento del Cliente (Técnico + Comercial) ───────────────────────────
  { campo: "principales_retos", seccion: "Conocimiento", etiqueta: "Principales retos", equipo: "Técnico", tipo: "text", ejemplo: "Modernizar su infraestructura on-premise", accountKey: "cr_bex_principalesretos" },
  { campo: "principales_dolores", seccion: "Conocimiento", etiqueta: "Principales dolores", equipo: "Técnico", tipo: "text", ejemplo: "Lentitud en el soporte de identidades", accountKey: "cr_bex_principalesdolores" },
  { campo: "objetivos_estrategicos", seccion: "Conocimiento", etiqueta: "Objetivos estratégicos", equipo: "Comercial", tipo: "text", ejemplo: "Migrar 80% de cargas a la nube en 2026", accountKey: "cr_bex_objetivosestrategicos" },
  { campo: "expectativas_bext", seccion: "Conocimiento", etiqueta: "Expectativas con BEXT", equipo: "Comercial", tipo: "text", ejemplo: "Acompañamiento proactivo y respuesta rápida", accountKey: "cr_bex_expectativasbext" },
  { campo: "riesgos_identificados", seccion: "Conocimiento", etiqueta: "Riesgos identificados", equipo: "Técnico", tipo: "text", ejemplo: "Dependencia de un único técnico interno", accountKey: "cr_bex_riesgosidentificados" },
  { campo: "oportunidades_negocio", seccion: "Conocimiento", etiqueta: "Oportunidades de negocio", equipo: "Comercial", tipo: "text", ejemplo: "Interés en Power BI y automatización", accountKey: "cr_bex_oportunidades" },

  // ── Soporte (Técnico) ────────────────────────────────────────────────────────
  { campo: "tiene_bolsa_horas", seccion: "Soporte", etiqueta: "¿Tiene bolsa de horas?", equipo: "Técnico", tipo: "boolean", ejemplo: "Sí", accountKey: "cr_bex_tienebolsahoras" },
  { campo: "horas_contratadas", seccion: "Soporte", etiqueta: "Horas contratadas", equipo: "Técnico", tipo: "int", ejemplo: "1000", accountKey: "cr_bex_horascontratadas" },
  { campo: "horas_consumidas", seccion: "Soporte", etiqueta: "Horas consumidas", equipo: "Técnico", tipo: "int", ejemplo: "154", accountKey: "cr_bex_horasconsumidas" },
  { campo: "nivel_satisfaccion", seccion: "Soporte", etiqueta: "Nivel de satisfacción (0-10)", equipo: "Técnico", tipo: "int", ejemplo: "8", accountKey: "cr_bex_nivelsatisfaccion" },
  { campo: "principales_solicitudes", seccion: "Soporte", etiqueta: "Principales solicitudes", equipo: "Técnico", tipo: "text", ejemplo: "Soporte de Microsoft 365 y Azure", accountKey: "cr_bex_principalessolicitudes" },

  // ── Customer Success ─────────────────────────────────────────────────────────
  { campo: "nivel_adopcion", seccion: "Customer Success", etiqueta: "Nivel de adopción", equipo: "Técnico", tipo: "text", ejemplo: "Alto", accountKey: "cr_bex_niveladopcion" },
  { campo: "potencial_crecimiento", seccion: "Customer Success", etiqueta: "Potencial de crecimiento", equipo: "Comercial", tipo: "text", ejemplo: "Alto", accountKey: "cr_bex_potencialcrecimiento" },
  { campo: "cliente_estrategico", seccion: "Customer Success", etiqueta: "Cliente estratégico", equipo: "Comercial", tipo: "boolean", ejemplo: "Sí", accountKey: "cr_bex_clienteestrategico" },
  { campo: "caso_exito", seccion: "Customer Success", etiqueta: "Caso de éxito", equipo: "Comercial", tipo: "boolean", ejemplo: "No", accountKey: "cr_bex_casoexito" },
  { campo: "acompanamiento_prioritario", seccion: "Customer Success", etiqueta: "Acompañamiento prioritario", equipo: "Comercial", tipo: "boolean", ejemplo: "Sí", accountKey: "cr_bex_acompanamientoprioritario" },
  { campo: "comentarios_cs", seccion: "Customer Success", etiqueta: "Comentarios CS", equipo: "Ambos", tipo: "text", ejemplo: "Cliente clave de la unidad de educación", accountKey: "cr_bex_comentarioscs" },

  // ── Observaciones ────────────────────────────────────────────────────────────
  { campo: "observaciones", seccion: "Observaciones", etiqueta: "Observaciones generales", equipo: "Ambos", tipo: "text", ejemplo: "Renovación de contrato en julio 2026", accountKey: "description" },
]

export const FIELD_BY_CAMPO: Record<string, ImportField> = Object.fromEntries(
  CLIENT_IMPORT_FIELDS.map((f) => [f.campo, f]),
)

// Texto guía que va en las celdas "valor" vacías de la plantilla. El import lo
// IGNORA (no se importa como dato real) para que las celdas sin diligenciar no
// pisen la información existente.
export const PLACEHOLDER_VALOR = "✏️ Edita esta celda"
export function esPlaceholder(v: string | undefined): boolean {
  const t = (v ?? "").trim()
  return t === "" || t.startsWith("✏️") || /^edita esta celda/i.test(t)
}

// Opciones válidas por campo (para guiar al que diligencia). Texto libre = sin lista.
export const FIELD_OPCIONES: Record<string, string> = {
  estado_cliente: "Activo · Inactivo · Prospecto · En riesgo",
  tiene_bolsa_horas: "Sí · No",
  cliente_estrategico: "Sí · No",
  caso_exito: "Sí · No",
  acompanamiento_prioritario: "Sí · No",
  nivel_adopcion: "Bajo · Medio · Alto · Óptimo",
  potencial_crecimiento: "Bajo · Medio · Alto",
  fecha_primer_negocio: "Fecha YYYY-MM-DD",
  horas_contratadas: "Número entero",
  horas_consumidas: "Número entero",
  nivel_satisfaccion: "Número 0 a 10",
}

// Coacciona un valor de texto del CSV al tipo del campo. Devuelve undefined si el
// valor está vacío o no es válido (semántica "rellenar": no se sobreescribe con vacío).
export function coerceValue(field: ImportField, raw: string): string | number | boolean | Date | undefined {
  const v = (raw ?? "").trim()
  if (v === "") return undefined
  switch (field.tipo) {
    case "int": {
      const n = parseInt(v, 10)
      return Number.isFinite(n) ? n : undefined
    }
    case "boolean": {
      if (/^(s[íi]|si|sí|true|1|x|y|yes)$/i.test(v)) return true
      if (/^(no|false|0|n)$/i.test(v)) return false
      return undefined
    }
    case "date": {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
      const d = m ? new Date(`${v}T00:00:00Z`) : new Date(v)
      return isNaN(d.getTime()) ? undefined : d
    }
    default:
      return v
  }
}

// Formatea el valor actual del Account para mostrarlo en la plantilla CSV.
export function formatForTemplate(field: ImportField, value: unknown): string {
  if (value == null) return ""
  switch (field.tipo) {
    case "boolean":
      return value ? "Sí" : "No"
    case "date":
      return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
    default:
      return String(value)
  }
}
