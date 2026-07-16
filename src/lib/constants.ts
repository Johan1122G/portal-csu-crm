// Catálogos centralizados para todos los dropdowns de la app.
// Single source of truth — actualizar aquí propaga a formularios y filtros.

export const ESTADOS_CLIENTE = ["Activo", "Inactivo", "Prospecto", "En riesgo"] as const

export const INDUSTRIAS = [
  "Educación",
  "Salud",
  "Financiero",
  "Gobierno",
  "Manufactura",
  "Retail",
  "Tecnología",
  "Energía",
  "Construcción",
  "Otro",
] as const

export const TAMANOS_EMPRESA = [
  "Micro (1-10)",
  "Pequeña (11-50)",
  "Mediana (51-200)",
  "Grande (201-1000)",
  "Enterprise (+1000)",
] as const

export const FRECUENCIAS_CONTACTO = [
  "Diaria",
  "Semanal",
  "Quincenal",
  "Mensual",
  "Trimestral",
] as const

export const NIVELES_RELACIONAMIENTO = ["Operativo", "Táctico", "Estratégico"] as const

export const ROLES_BEXT = [
  "Ejecutivo Comercial",
  "Gerente de Proyecto",
  "Líder Técnico",
] as const

export const TIPOS_GESTION = [
  "Llamada",
  "Encuesta",
  "Entrevista",
  "Correo",
  "Reunión",
  "Hallazgo",
  "Oportunidad",
  "Recomendación",
] as const

export const CANALES = ["Teléfono", "Email", "Teams", "Presencial", "WhatsApp"] as const

export const AREAS_ESCALAR = [
  "Plataformas",
  "Aplicaciones",
  "Producto",
  "PMO",
  "Comercial",
  "Customer Success Unit",
  "Administración",
] as const

export const NIVELES_ADOPCION = ["Bajo", "Medio", "Alto", "Óptimo"] as const

export const POTENCIAL_CRECIMIENTO = ["Bajo", "Medio", "Alto"] as const

export const TIPOS_OPORTUNIDAD = [
  "Comercial",
  "Operativa",
  "Producto",
  "Soporte",
  "Escalamiento",
] as const

export const IMPACTOS = ["Alto", "Medio", "Bajo"] as const

export const PRIORIDADES = ["Alta", "Media", "Baja"] as const

export const ESTADOS_OPORTUNIDAD = [
  "Pendiente",
  "En proceso",
  "Completada",
  "Cancelada",
] as const

export const ESTADOS_SERVICIO = [
  "Activo",
  "Suspendido",
  "Cancelado",
  "En renovación",
] as const

export const LINEAS_NEGOCIO = [
  "Managed Services",
  "Cloud",
  "Seguridad",
  "Desarrollo",
  "Licenciamiento",
  "Consultoría",
] as const

export const TIPOS_CONTACTO = [
  "Principal",
  "Ejecutivo",
  "Técnico",
  "Operativo",
  "Financiero",
  "Otro",
] as const

export const ORIGENES_OPORTUNIDAD = [
  "Gestión CS",
  "Reunión",
  "Encuesta",
  "Soporte",
  "Otro",
] as const

// Valor agregado / entregables recurrentes.
export const TIPOS_ENTREGABLE = [
  "Informe de gestión de mesa",
  "Informe de vulnerabilidades",
  "Informe MIM",
  "Informe AD",
  "Informe de disponibilidad",
  "Reunión de seguimiento",
  "QBR / revisión ejecutiva",
  "Plan de trabajo",
] as const

export const FRECUENCIAS_ENTREGABLE = [
  "Semanal",
  "Quincenal",
  "Mensual",
  "Bimensual",
  "Trimestral",
  "Semestral",
  "Anual",
  "Única vez",
] as const

// ─── Catálogos editables ───────────────────────────────────────────────────────
// Los valores arriba son los DEFAULTS de siembra. En runtime las listas se cargan
// desde la tabla `catalogs` (administrable por el CSM). La key identifica cada lista.
export const CATALOG_DEFAULTS: Record<string, readonly string[]> = {
  ESTADOS_CLIENTE,
  INDUSTRIAS,
  TAMANOS_EMPRESA,
  FRECUENCIAS_CONTACTO,
  NIVELES_RELACIONAMIENTO,
  ROLES_BEXT,
  TIPOS_GESTION,
  CANALES,
  AREAS_ESCALAR,
  NIVELES_ADOPCION,
  POTENCIAL_CRECIMIENTO,
  TIPOS_OPORTUNIDAD,
  IMPACTOS,
  PRIORIDADES,
  ESTADOS_OPORTUNIDAD,
  ESTADOS_SERVICIO,
  LINEAS_NEGOCIO,
  TIPOS_CONTACTO,
  ORIGENES_OPORTUNIDAD,
  TIPOS_ENTREGABLE,
  FRECUENCIAS_ENTREGABLE,
}

// Etiqueta legible de cada catálogo para la página de administración.
export const CATALOG_LABELS: Record<string, string> = {
  ESTADOS_CLIENTE: "Estados de cliente",
  INDUSTRIAS: "Industrias",
  TAMANOS_EMPRESA: "Tamaños de empresa",
  FRECUENCIAS_CONTACTO: "Frecuencias de contacto",
  NIVELES_RELACIONAMIENTO: "Niveles de relacionamiento",
  ROLES_BEXT: "Roles BEXT",
  TIPOS_GESTION: "Tipos de gestión (categorías)",
  CANALES: "Canales",
  AREAS_ESCALAR: "Áreas a escalar",
  NIVELES_ADOPCION: "Niveles de adopción",
  POTENCIAL_CRECIMIENTO: "Potencial de crecimiento",
  TIPOS_OPORTUNIDAD: "Tipos de oportunidad",
  IMPACTOS: "Impactos",
  PRIORIDADES: "Prioridades",
  ESTADOS_OPORTUNIDAD: "Estados de oportunidad/gestión",
  ESTADOS_SERVICIO: "Estados de servicio",
  LINEAS_NEGOCIO: "Líneas de negocio",
  TIPOS_CONTACTO: "Tipos de contacto",
  ORIGENES_OPORTUNIDAD: "Orígenes de oportunidad",
  TIPOS_ENTREGABLE: "Tipos de entregable (valor agregado)",
  FRECUENCIAS_ENTREGABLE: "Frecuencias de entregable",
}

export type CatalogKey = keyof typeof CATALOG_DEFAULTS

// Estados que afectan lógica/badges — editar con cuidado (renombrar puede afectar KPIs).
export const SYSTEM_CATALOG_KEYS = [
  "ESTADOS_CLIENTE",
  "ESTADOS_OPORTUNIDAD",
  "ESTADOS_SERVICIO",
  "PRIORIDADES",
]

// Navegación lateral del AppShell.
export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "home" },
  { href: "/clientes", label: "Clientes", icon: "people" },
  { href: "/actividades", label: "Gestiones CS", icon: "tasks" },
  { href: "/oportunidades", label: "Oportunidades", icon: "lightbulb" },
] as const
