import { z } from "zod"

// Helpers — los formularios mandan "" para vacíos; los normalizamos a undefined.
const optStr = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional(),
)

const optDate = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.coerce.date().optional(),
)

const optInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().optional(),
)

// ─── Contacto ────────────────────────────────────────────────────────────────
export const contactSchema = z.object({
  cr_bex_tipocontacto: z.string().min(1, "Tipo requerido"),
  fullname: z.string().min(1, "Nombre requerido"),
  jobtitle: optStr,
  telephone1: optStr,
  emailaddress1: z.string().min(1, "Correo requerido").email("Correo inválido"),
})

// ─── Relacionamiento BEXT ──────────────────────────────────────────────────────
export const relationshipSchema = z.object({
  cr_bex_rolbext: z.string().min(1, "Rol requerido"),
  cr_bex_nombrepersona: z.string().min(1, "Nombre requerido"),
  cr_bex_frecuenciacontacto: optStr,
  cr_bex_nivelrelacionamiento: optStr,
  cr_bex_ultimareunion: optDate,
  cr_bex_proximareunion: optDate,
  cr_bex_motivoultimocontacto: optStr,
})

// ─── Account (cliente) ─────────────────────────────────────────────────────────
export const accountSchema = z.object({
  // Sección 1
  name: z.string().min(1, "Razón social requerida"),
  accountnumber: z.string().min(1, "NIT requerido"),
  cr_bex_estadocliente: z.string().default("Activo"),
  industrycode: optStr,
  address1_city: optStr,
  address1_country: z.string().default("Colombia"),
  cr_bex_tamanoempresa: optStr,
  websiteurl: optStr,
  cr_bex_primernegocio: optDate,

  // Sección 4 — Conocimiento
  cr_bex_principalesretos: optStr,
  cr_bex_principalesdolores: optStr,
  cr_bex_objetivosestrategicos: optStr,
  cr_bex_expectativasbext: optStr,
  cr_bex_riesgosidentificados: optStr,
  cr_bex_oportunidades: optStr,

  // Sección 5 — Soporte
  cr_bex_tienebolsahoras: z.coerce.boolean().default(false),
  cr_bex_horascontratadas: optInt,
  cr_bex_horasconsumidas: optInt,
  cr_bex_nivelsatisfaccion: optInt,
  cr_bex_principalessolicitudes: optStr,

  // Sección 5 — Customer Success
  cr_bex_niveladopcion: optStr,
  cr_bex_clienteestrategico: z.coerce.boolean().default(false),
  cr_bex_casoexito: z.coerce.boolean().default(false),
  cr_bex_potencialcrecimiento: optStr,
  cr_bex_acompanamientoprioritario: z.coerce.boolean().default(false),
  cr_bex_comentarioscs: optStr,

  // Sección 6
  description: optStr,
})

// Payload completo de creación: account + relaciones anidadas.
export const createClienteSchema = accountSchema.extend({
  contacts: z.array(contactSchema).optional().default([]),
  relationships: z.array(relationshipSchema).optional().default([]),
})

// Update: todos los campos del account opcionales. El accountnumber (NIT) SÍ es
// editable (los clientes importados de GLPI traen un NIT placeholder a corregir).
export const updateClienteSchema = accountSchema.partial()

// Contacto / Relacionamiento standalone (incluyen accountId para crear desde la vista 360°).
export const createContactSchema = contactSchema.extend({ accountId: z.string().min(1, "Cliente requerido") })
export const updateContactSchema = contactSchema.partial()
export const createRelationshipSchema = relationshipSchema.extend({
  accountId: z.string().min(1, "Cliente requerido"),
})
export const updateRelationshipSchema = relationshipSchema.partial()

// ─── Producto / Servicio ───────────────────────────────────────────────────────
export const productSchema = z.object({
  accountId: z.string().min(1),
  title: z.string().min(1),
  cr_bex_lineanegocio: optStr,
  cr_bex_productoservicio: z.string().min(1, "Producto/servicio requerido"),
  statecode: z.string().default("Activo"),
  activeon: optDate,
  expireson: optDate,
  cr_bex_responsablebext: optStr,
  cr_bex_observaciones: optStr,
})
export const updateProductSchema = productSchema.partial().omit({ accountId: true })

// ─── Gestión CS (actividad) ─────────────────────────────────────────────────────
export const activitySchema = z.object({
  accountId: z.string().min(1, "Cliente requerido"),
  scheduledstart: z.coerce.date(),
  cr_bex_tipogestion: z.string().min(1, "Tipo requerido"),
  cr_bex_responsablecs: optStr,
  cr_bex_contactocliente: optStr,
  cr_bex_canal: optStr,
  subject: optStr,
  description: optStr,
  cr_bex_oportunidad: optStr,
  cr_bex_areaescalar: optStr,
  statecode: z.string().default("Completada"),
})

// ─── Oportunidad / Recomendación ────────────────────────────────────────────────
export const opportunitySchema = z.object({
  accountId: z.string().min(1, "Cliente requerido"),
  cr_bex_origen: z.string().default("Gestión CS"),
  name: z.string().min(1, "Descripción requerida"),
  cr_bex_tipo: optStr,
  cr_bex_impacto: optStr,
  prioritycode: optStr,
  cr_bex_responsable: optStr,
  cr_bex_accionrequerida: optStr,
  estimatedclosedate: optDate,
  statecode: z.string().default("Pendiente"),
  serviceCatalogItemId: optStr,
})

// Edición: todos los campos editables (excepto el cliente). Las cadenas vacías se
// interpretan como "limpiar" (a diferencia del create, que usa fill semantics).
export const updateOpportunitySchema = z.object({
  name: z.string().min(1, "Descripción requerida"),
  cr_bex_origen: z.string().optional(),
  cr_bex_tipo: z.string().optional(),
  cr_bex_impacto: z.string().optional(),
  prioritycode: z.string().optional(),
  cr_bex_responsable: z.string().optional(),
  cr_bex_accionrequerida: z.string().optional(),
  estimatedclosedate: z.string().optional(),
  statecode: z.string().optional(),
  serviceCatalogItemId: z.string().optional(),
})

export type CreateClienteInput = z.infer<typeof createClienteSchema>
export type ContactInput = z.infer<typeof contactSchema>
export type RelationshipInput = z.infer<typeof relationshipSchema>
export type ActivityInput = z.infer<typeof activitySchema>
export type OpportunityInput = z.infer<typeof opportunitySchema>
export type ProductInput = z.infer<typeof productSchema>
