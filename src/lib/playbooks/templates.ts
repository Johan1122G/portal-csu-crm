// ─── Plantillas de Playbooks de Customer Success ─────────────────────────────────
// Un playbook es una secuencia estándar de tareas que el CSM aplica ante una
// situación típica (recuperar un cliente en rojo, gestionar una renovación,
// arrancar un onboarding). Al "aplicar" un playbook a un cliente se materializan
// sus tareas (modelo Task) agrupadas en un PlaybookRun.
//
// Las plantillas viven en código (no en catálogo editable) porque son estructura
// de proceso, no un simple dropdown. Si más adelante el CSM quiere editarlas, se
// migran a una tabla — pero arrancar en código es lo más rápido y versionable.

export type PlaybookTaskDef = {
  titulo: string
  detalle?: string
  // Días a partir de HOY para la fecha límite sugerida de la tarea.
  offsetDias: number
  prioridad: "Alta" | "Media" | "Baja"
  // Rol sugerido (texto libre): quién suele encargarse de esta tarea.
  rolSugerido?: string
}

export type PlaybookTemplate = {
  key: string
  titulo: string
  descripcion: string
  // Situación que dispara este playbook (se muestra al CSM como ayuda).
  cuando: string
  tasks: PlaybookTaskDef[]
}

export const PLAYBOOK_TEMPLATES: PlaybookTemplate[] = [
  {
    key: "recuperacion",
    titulo: "Recuperación de cliente en riesgo",
    descripcion: "Plan para revertir un cliente en rojo: diagnóstico, contacto ejecutivo y plan de acción.",
    cuando: "El cliente está en rojo (salud baja) o con señales de fuga.",
    tasks: [
      {
        titulo: "Diagnosticar la causa del riesgo",
        detalle: "Revisar salud, tickets recientes, CSAT y últimas reuniones. Identificar el driver principal del deterioro.",
        offsetDias: 2,
        prioridad: "Alta",
        rolSugerido: "CSM",
      },
      {
        titulo: "Agendar reunión de seguimiento con el cliente",
        detalle: "Contactar al patrocinador/contacto principal para escuchar su percepción y expectativas.",
        offsetDias: 5,
        prioridad: "Alta",
        rolSugerido: "CSM / Ejecutivo Comercial",
      },
      {
        titulo: "Definir plan de acción conjunto",
        detalle: "Acordar compromisos concretos con fechas y responsables (BEXT y cliente).",
        offsetDias: 10,
        prioridad: "Alta",
        rolSugerido: "CSM",
      },
      {
        titulo: "Escalar internamente si aplica",
        detalle: "Involucrar a Dirección/Técnico si el riesgo lo amerita.",
        offsetDias: 7,
        prioridad: "Media",
        rolSugerido: "CSM",
      },
      {
        titulo: "Revisión de resultados a 30 días",
        detalle: "Verificar si la salud mejoró tras las acciones; ajustar el plan.",
        offsetDias: 30,
        prioridad: "Media",
        rolSugerido: "CSM",
      },
    ],
  },
  {
    key: "renovacion",
    titulo: "Gestión de renovación",
    descripcion: "Asegurar la renovación de un contrato/bolsa que está por vencer.",
    cuando: "Hay una renovación o bolsa de horas próxima a vencer (≤ 60-90 días).",
    tasks: [
      {
        titulo: "Preparar balance de valor entregado",
        detalle: "Resumir logros, tickets atendidos, horas consumidas y resultados del período.",
        offsetDias: 5,
        prioridad: "Alta",
        rolSugerido: "CSM",
      },
      {
        titulo: "Reunión de renovación con el cliente",
        detalle: "Presentar el balance y la propuesta de continuidad/ampliación.",
        offsetDias: 12,
        prioridad: "Alta",
        rolSugerido: "Ejecutivo Comercial",
      },
      {
        titulo: "Enviar propuesta / cotización de renovación",
        offsetDias: 18,
        prioridad: "Alta",
        rolSugerido: "Ejecutivo Comercial",
      },
      {
        titulo: "Confirmar renovación y actualizar contrato en el portal",
        detalle: "Registrar la nueva fecha de vencimiento y bolsa en Productos/Servicios.",
        offsetDias: 25,
        prioridad: "Media",
        rolSugerido: "CSM",
      },
    ],
  },
  {
    key: "onboarding",
    titulo: "Onboarding de nuevo cliente",
    descripcion: "Arranque estructurado de un cliente recién incorporado.",
    cuando: "Cliente nuevo o inicio de un nuevo servicio.",
    tasks: [
      {
        titulo: "Reunión de kickoff",
        detalle: "Presentar el equipo BEXT, canales de soporte y expectativas mutuas.",
        offsetDias: 5,
        prioridad: "Alta",
        rolSugerido: "CSM",
      },
      {
        titulo: "Levantar contexto del cliente en el portal",
        detalle: "Completar objetivos, retos, contactos y relacionamiento (usa el import CSV si aplica).",
        offsetDias: 7,
        prioridad: "Media",
        rolSugerido: "CSM",
      },
      {
        titulo: "Verificar acceso a soporte (GLPI) y vínculo de entidad",
        offsetDias: 7,
        prioridad: "Media",
        rolSugerido: "CSM / Técnico",
      },
      {
        titulo: "Definir cadencia de seguimiento",
        detalle: "Acordar frecuencia de reuniones y registrar en Relacionamiento.",
        offsetDias: 10,
        prioridad: "Media",
        rolSugerido: "CSM",
      },
      {
        titulo: "Primera revisión de adopción a 30 días",
        offsetDias: 30,
        prioridad: "Baja",
        rolSugerido: "CSM",
      },
    ],
  },
]

export function getPlaybookTemplate(key: string): PlaybookTemplate | undefined {
  return PLAYBOOK_TEMPLATES.find((t) => t.key === key)
}
