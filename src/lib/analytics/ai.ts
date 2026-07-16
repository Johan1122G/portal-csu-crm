// ─── Capa de IA (Fase 3) ─────────────────────────────────────────────────────────
// Toma los agregados YA CALCULADOS (motor determinístico) + el contexto del cliente
// y pide a Azure OpenAI que redacte hallazgos y recomendaciones accionables.
// Regla dura: la IA NO calcula ni inventa números — solo usa los que se le pasan.
//
// Config por env con guard (estado "pendiente de configurar" en la UI, como Graph).

import { z } from "zod"
import type { ClientAnalytics } from "@/lib/analytics/aggregate"
import type { ClientContext } from "@/lib/analytics/context"

type AiConfig = {
  endpoint: string
  apiKey: string
  deployment: string
  apiVersion: string
}

const isPlaceholder = (v?: string) => !v || v.startsWith("<") || v.trim() === ""

function tryReadConfig(): AiConfig | null {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT
  if (isPlaceholder(endpoint) || isPlaceholder(apiKey) || isPlaceholder(deployment)) return null
  return {
    endpoint: endpoint!.replace(/\/+$/, ""),
    apiKey: apiKey!,
    deployment: deployment!,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview",
  }
}

export function isAiConfigured(): boolean {
  return tryReadConfig() !== null
}

export type Finding = {
  titulo: string
  tipo: string // Assessment | Capacitación | Proyecto | Upsell | Riesgo | Mejora de proceso | Otro
  evidencia: string
  recomendacion: string
  impacto: string // Alto | Medio | Bajo
  confianza: string // Alta | Media | Baja
  servicio?: string // nombre EXACTO de un servicio del catálogo BEXT (o "")
}

const FindingSchema = z.object({
  titulo: z.string(),
  tipo: z.string(),
  evidencia: z.string(),
  recomendacion: z.string(),
  impacto: z.string(),
  confianza: z.string(),
  servicio: z.string().optional().default(""),
})

export type CatalogoItem = { nombre: string; unidad: string; categoria?: string | null; descripcion?: string | null }
const ResponseSchema = z.object({ hallazgos: z.array(FindingSchema) })

// Compacta los agregados para el prompt (limita listas largas → menos tokens).
function compactPayload(analytics: ClientAnalytics, context: ClientContext) {
  return {
    cliente: {
      nombre: context.name,
      industria: context.industria,
      estrategico: context.estrategico,
      nivelAdopcion: context.nivelAdopcion,
      potencialCrecimiento: context.potencialCrecimiento,
      objetivos: context.objetivos,
      expectativas: context.expectativas,
      retos: context.retos,
      horasContratadas: context.horasContratadas,
      horasConsumidas: context.horasConsumidas,
    },
    resumen: analytics.resumen,
    porCategoria: analytics.porCategoria.slice(0, 8),
    porEstado: analytics.porEstado,
    tendenciaMensual: analytics.tendenciaMensual.slice(-12),
    recurrentes: analytics.recurrentes,
  }
}

const SYSTEM_PROMPT = `Eres analista senior de Customer Success de BEXTechnology, una empresa de Managed Services (Azure, Microsoft 365, identidad/AD/MIM, seguridad, soporte).
Recibes MÉTRICAS YA CALCULADAS de los tickets de soporte (GLPI) de un cliente y su contexto comercial. Tu tarea es encontrar HALLAZGOS ACCIONABLES que BEXTechnology pueda usar para mejorar el servicio o generar negocio.

Reglas estrictas:
- NO inventes ni recalcules números. Usa SOLO los valores que se te entregan; cítalos textualmente en "evidencia".
- Prioriza patrones: concentración de tickets en una categoría (→ assessment de esa plataforma), tendencias al alza (→ riesgo o proyecto), asuntos recurrentes (→ causa raíz / capacitación), tiempos de resolución altos, consumo de horas vs contratadas (→ upsell), CSAT bajo (→ riesgo de cliente).
- Si la categorización es baja (categorizacionPct bajo), señálalo como un hallazgo de mejora de proceso (no se puede analizar bien sin categorizar).
- La categoría "(categoría eliminada)" NO es analizable: son tickets cuya categoría fue borrada en GLPI. NO recomiendes assessments sobre ella; úsala solo como señal de higiene de datos (categorías retiradas) si su volumen es alto.
- Sé concreto y orientado a acción de negocio. Máximo 5 hallazgos, ordenados por impacto.
- tipo ∈ {Assessment, Capacitación, Proyecto, Upsell, Riesgo, Mejora de proceso, Otro}. impacto ∈ {Alto, Medio, Bajo}. confianza ∈ {Alta, Media, Baja}.
- Cuando el hallazgo implique OFRECER un servicio de BEXT (upsell, assessment, proyecto), DEBES elegir uno del CATÁLOGO BEXT que se te entrega y poner su nombre EXACTO en el campo "servicio". Si ninguno aplica, deja "servicio" vacío. NO inventes nombres de servicio fuera del catálogo.

Responde SOLO con JSON válido: {"hallazgos":[{"titulo","tipo","evidencia","recomendacion","impacto","confianza","servicio"}]}`

// Llama a Azure OpenAI y devuelve los hallazgos validados. Lanza si no está
// configurado o si la respuesta no es JSON válido.
export async function generateFindings(input: {
  analytics: ClientAnalytics
  context: ClientContext
  catalogo?: CatalogoItem[]
}): Promise<Finding[]> {
  const cfg = tryReadConfig()
  if (!cfg) throw new Error("Azure OpenAI no está configurado (AZURE_OPENAI_*).")

  const payload = {
    ...compactPayload(input.analytics, input.context),
    catalogoBext: (input.catalogo ?? []).map((c) => ({
      servicio: c.nombre,
      unidad: c.unidad,
      categoria: c.categoria ?? undefined,
      que_ofrece: c.descripcion ?? undefined,
    })),
  }
  const url = `${cfg.endpoint}/openai/deployments/${cfg.deployment}/chat/completions?api-version=${cfg.apiVersion}`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": cfg.apiKey },
    cache: "no-store",
    body: JSON.stringify({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(payload) },
      ],
      temperature: 0.2,
      max_tokens: 1800,
      response_format: { type: "json_object" },
    }),
  })

  const json = (await res.json().catch(() => null)) as
    | { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
    | null
  if (!res.ok || !json) {
    throw new Error(`Azure OpenAI devolvió ${res.status}: ${json?.error?.message ?? "error"}`)
  }

  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error("Azure OpenAI no devolvió contenido.")

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error("La respuesta de la IA no es JSON válido.")
  }
  const result = ResponseSchema.safeParse(parsed)
  if (!result.success) throw new Error("La respuesta de la IA no tiene el formato esperado.")
  return result.data.hallazgos.slice(0, 5)
}

// ─── Q&A interactivo con tool calling (Fase 4C) ──────────────────────────────────
// El CSM pregunta libremente; la IA usa la herramienta buscar_tickets para traer
// solo los tickets relevantes y responde citando datos reales.

type ChatMsg = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_calls?: unknown; tool_call_id?: string; name?: string }

const QA_SYSTEM = `Eres analista senior de Customer Success de BEXTechnology (Managed Services: Azure, Microsoft 365, identidad/AD/MIM, seguridad, Power BI, soporte).
Respondes preguntas del CSM sobre UN cliente, basándote en sus tickets de soporte de GLPI.
- Tienes la herramienta "buscar_tickets" para consultar tickets reales. ÚSALA antes de afirmar algo específico (categorías, recurrencias, ejemplos). No inventes; cita números de ticket y datos concretos.
- Para preguntas de panorama puedes usar el resumen que se te da sin buscar.
- Responde en español, conciso y orientado a acción (assessment, capacitación, proyecto, upsell, riesgo) cuando aplique.
- "(categoría eliminada)" NO es una categoría analizable (categorías borradas en GLPI); no ahondes en ella salvo como señal de higiene de datos.`

const BUSCAR_TICKETS_TOOL = {
  type: "function",
  function: {
    name: "buscar_tickets",
    description:
      "Busca tickets de soporte del cliente en GLPI. Filtra por categoría, texto (asunto/descripción), estado o fechas. Devuelve el total que cumple el filtro y una muestra de tickets.",
    parameters: {
      type: "object",
      properties: {
        categoria: { type: "string", description: "Categoría (coincidencia parcial), ej. 'Azure', 'Seguridad', 'Power BI'." },
        texto: { type: "string", description: "Texto a buscar en asunto y descripción del ticket." },
        estado: { type: "string", enum: ["abierto", "cerrado", "todos"], description: "Estado de los tickets." },
        desde: { type: "string", description: "Fecha desde (YYYY-MM-DD)." },
        hasta: { type: "string", description: "Fecha hasta (YYYY-MM-DD)." },
        limite: { type: "number", description: "Máximo de tickets a devolver (default 40, máx 80)." },
      },
    },
  },
}

type ToolCall = { id: string; function: { name: string; arguments: string } }

// Responde una pregunta del CSM con tool calling. ejecutarBusqueda corre la
// herramienta (buscarTickets) contra la BD. Máx 4 vueltas de herramienta.
export async function answerClientQuestion(input: {
  pregunta: string
  contextoResumen: string
  historial?: { role: "user" | "assistant"; content: string }[]
  ejecutarBusqueda: (filtros: Record<string, unknown>) => Promise<unknown>
}): Promise<{ respuesta: string; consultas: number }> {
  const cfg = tryReadConfig()
  if (!cfg) throw new Error("Azure OpenAI no está configurado (AZURE_OPENAI_*).")
  const url = `${cfg.endpoint}/openai/deployments/${cfg.deployment}/chat/completions?api-version=${cfg.apiVersion}`

  const messages: ChatMsg[] = [
    { role: "system", content: QA_SYSTEM },
    { role: "system", content: `Resumen del cliente (datos ya calculados):\n${input.contextoResumen}` },
    ...(input.historial ?? []).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: input.pregunta },
  ]

  let consultas = 0
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": cfg.apiKey },
      cache: "no-store",
      body: JSON.stringify({ messages, tools: [BUSCAR_TICKETS_TOOL], temperature: 0.2, max_tokens: 1200 }),
    })
    const json = (await res.json().catch(() => null)) as
      | { choices?: { message?: ChatMsg }[]; error?: { message?: string } }
      | null
    if (!res.ok || !json) throw new Error(`Azure OpenAI devolvió ${res.status}: ${json?.error?.message ?? "error"}`)

    const msg = json.choices?.[0]?.message
    if (!msg) throw new Error("Azure OpenAI no devolvió mensaje.")
    messages.push(msg)

    const toolCalls = (msg.tool_calls as ToolCall[] | undefined) ?? []
    if (toolCalls.length === 0) {
      return { respuesta: msg.content ?? "No pude generar una respuesta.", consultas }
    }
    // Ejecutar cada llamada a herramienta y devolver su resultado al modelo.
    for (const tc of toolCalls) {
      consultas++
      let filtros: Record<string, unknown> = {}
      try {
        filtros = JSON.parse(tc.function.arguments || "{}")
      } catch {
        /* args inválidos → búsqueda vacía */
      }
      let resultado: unknown
      try {
        resultado = await input.ejecutarBusqueda(filtros)
      } catch (e) {
        resultado = { error: e instanceof Error ? e.message : "error en la búsqueda" }
      }
      messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(resultado) })
    }
  }
  // Si se agotaron las vueltas, pedir respuesta final sin herramientas.
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": cfg.apiKey },
    cache: "no-store",
    body: JSON.stringify({ messages, temperature: 0.2, max_tokens: 1200 }),
  })
  const json = (await res.json().catch(() => null)) as { choices?: { message?: ChatMsg }[] } | null
  return { respuesta: json?.choices?.[0]?.message?.content ?? "No pude completar la respuesta.", consultas }
}

// ─── QBR: narrativa ejecutiva ────────────────────────────────────────────────────
// Redacta el texto del Quarterly Business Review a partir de métricas ya calculadas.
// No inventa números; produce resumen ejecutivo, logros y próximos pasos.
export type QbrNarrative = {
  resumenEjecutivo: string
  logros: string[]
  proximosPasos: string[]
}

const QbrNarrativeSchema = z.object({
  resumenEjecutivo: z.string().default(""),
  logros: z.array(z.string()).default([]),
  proximosPasos: z.array(z.string()).default([]),
})

export async function generateQbrNarrative(payload: unknown): Promise<QbrNarrative | null> {
  const cfg = tryReadConfig()
  if (!cfg) return null
  const url = `${cfg.endpoint}/openai/deployments/${cfg.deployment}/chat/completions?api-version=${cfg.apiVersion}`

  const system = `Eres CSM senior de BEXTechnology (Managed Services). Redactas el texto de un Quarterly Business Review (QBR) para presentar a un cliente, a partir de MÉTRICAS YA CALCULADAS de su soporte y contexto.
Reglas:
- NO inventes ni recalcules cifras; usa solo las que se te dan. Si un dato falta, no lo menciones.
- resumenEjecutivo: 3-4 frases, tono profesional y positivo pero honesto.
- logros: 2-4 viñetas de valor entregado en el período (basadas en tickets resueltos, horas, mejoras).
- proximosPasos: 2-4 viñetas accionables para el próximo período (renovaciones, assessments, mejoras).
Responde SOLO JSON: {"resumenEjecutivo","logros":[],"proximosPasos":[]}`

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": cfg.apiKey },
      cache: "no-store",
      body: JSON.stringify({
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(payload) },
        ],
        temperature: 0.3,
        max_tokens: 900,
        response_format: { type: "json_object" },
      }),
    })
    const json = (await res.json().catch(() => null)) as { choices?: { message?: { content?: string } }[] } | null
    const content = json?.choices?.[0]?.message?.content
    if (!content) return null
    const parsed = QbrNarrativeSchema.safeParse(JSON.parse(content))
    return parsed.success ? parsed.data : null
  } catch {
    return null // el QBR se renderiza igual sin narrativa
  }
}

// ─── Digest diario: intro narrativa breve ────────────────────────────────────────
// Recibe los conteos YA calculados del digest y redacta un párrafo ejecutivo para
// abrir el resumen. No inventa datos: solo usa los conteos que se le pasan.
export async function generateDigestIntro(resumen: {
  totalClientes: number
  enRojo: number
  renovaciones: number
  bolsas: number
  sinContacto: number
  entregablesPendientes?: number
  topRiesgos: string[]
}): Promise<string | null> {
  const cfg = tryReadConfig()
  if (!cfg) return null
  const url = `${cfg.endpoint}/openai/deployments/${cfg.deployment}/chat/completions?api-version=${cfg.apiVersion}`

  const system = `Eres el asistente de Customer Success de BEXTechnology. Redacta un párrafo BREVE (2-3 frases) que abra el digest diario del CSM, resaltando lo más urgente. Usa SOLO los conteos que se te dan; no inventes. Tono directo y accionable, en español.`
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": cfg.apiKey },
      cache: "no-store",
      body: JSON.stringify({
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(resumen) },
        ],
        temperature: 0.4,
        max_tokens: 220,
      }),
    })
    const json = (await res.json().catch(() => null)) as { choices?: { message?: { content?: string } }[] } | null
    return json?.choices?.[0]?.message?.content?.trim() ?? null
  } catch {
    return null // el digest funciona sin intro
  }
}

// ─── Acciones sugeridas (borradores para el CSM) ─────────────────────────────────
// A partir de los agregados + la salud + el contexto, la IA propone las próximas
// acciones concretas (tareas) que el CSM debería ejecutar. NO se crean solas: se
// devuelven como borradores para que el CSM apruebe las que quiera (crea Tasks).

export type SuggestedAction = {
  titulo: string
  detalle: string
  prioridad: string // Alta | Media | Baja
}

const SuggestedActionSchema = z.object({
  titulo: z.string(),
  detalle: z.string().default(""),
  prioridad: z.string().default("Media"),
})
const SuggestionsSchema = z.object({ acciones: z.array(SuggestedActionSchema) })

const ACCIONES_SYSTEM = `Eres CSM senior de BEXTechnology (Managed Services: Azure, Microsoft 365, identidad, seguridad, soporte).
Recibes la SALUD y MÉTRICAS ya calculadas de un cliente. Propón las PRÓXIMAS ACCIONES concretas y accionables que el CSM debería ejecutar para mejorar o proteger la cuenta.
Reglas:
- NO inventes números; básate solo en las señales que se te dan (drivers en mal estado, bolsa por agotarse, renovaciones próximas, días sin contacto, tickets al alza, CSAT bajo).
- Cada acción debe ser una TAREA ejecutable por una persona (verbo de acción), no un análisis genérico.
- Prioriza lo urgente/de mayor impacto. Máximo 5 acciones.
- prioridad ∈ {Alta, Media, Baja}. Responde en español.
Responde SOLO JSON: {"acciones":[{"titulo","detalle","prioridad"}]}`

export async function suggestActions(input: {
  analytics: ClientAnalytics
  context: ClientContext
  // Señales de salud ya calculadas (drivers, bolsa, engagement, renovaciones).
  salud: unknown
}): Promise<SuggestedAction[]> {
  const cfg = tryReadConfig()
  if (!cfg) throw new Error("Azure OpenAI no está configurado (AZURE_OPENAI_*).")
  const url = `${cfg.endpoint}/openai/deployments/${cfg.deployment}/chat/completions?api-version=${cfg.apiVersion}`

  const payload = {
    cliente: {
      nombre: input.context.name,
      industria: input.context.industria,
      estrategico: input.context.estrategico,
      nivelAdopcion: input.context.nivelAdopcion,
    },
    salud: input.salud,
    resumen: input.analytics.resumen,
    tendenciaMensual: input.analytics.tendenciaMensual.slice(-6),
    recurrentes: input.analytics.recurrentes.slice(0, 5),
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": cfg.apiKey },
    cache: "no-store",
    body: JSON.stringify({
      messages: [
        { role: "system", content: ACCIONES_SYSTEM },
        { role: "user", content: JSON.stringify(payload) },
      ],
      temperature: 0.3,
      max_tokens: 900,
      response_format: { type: "json_object" },
    }),
  })
  const json = (await res.json().catch(() => null)) as
    | { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
    | null
  if (!res.ok || !json) throw new Error(`Azure OpenAI devolvió ${res.status}: ${json?.error?.message ?? "error"}`)
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error("La IA no devolvió contenido.")
  const parsed = SuggestionsSchema.safeParse(JSON.parse(content))
  if (!parsed.success) throw new Error("La respuesta de la IA no tiene el formato esperado.")
  return parsed.data.acciones.slice(0, 5)
}

// ─── 8b: Análisis IA de una reunión (transcripción / notas Copilot) ──────────────
export type MeetingAnalysis = {
  resumen: string
  necesidades: string[]
  sentimiento: string // Positivo | Neutral | Negativo
  satisfaccion: string // Satisfecho | Neutral | Insatisfecho | Sin señal
  malestar: string[]
  oportunidades: string[]
}

const MeetingAnalysisSchema = z.object({
  resumen: z.string(),
  necesidades: z.array(z.string()).default([]),
  sentimiento: z.string().default("Neutral"),
  satisfaccion: z.string().default("Sin señal"),
  malestar: z.array(z.string()).default([]),
  oportunidades: z.array(z.string()).default([]),
})

export async function analyzeMeeting(input: {
  clienteNombre: string
  transcript?: string | null
  aiNotes?: unknown | null
}): Promise<MeetingAnalysis> {
  const cfg = tryReadConfig()
  if (!cfg) throw new Error("Azure OpenAI no está configurado (AZURE_OPENAI_*).")
  const url = `${cfg.endpoint}/openai/deployments/${cfg.deployment}/chat/completions?api-version=${cfg.apiVersion}`

  const contenido = [
    input.transcript ? `TRANSCRIPCIÓN:\n${input.transcript.slice(0, 12000)}` : "",
    input.aiNotes ? `NOTAS IA (Copilot):\n${JSON.stringify(input.aiNotes).slice(0, 6000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  const system = `Eres analista de Customer Success de BEXTechnology. Analizas una reunión con el cliente "${input.clienteNombre}" a partir de su transcripción o notas. Extrae SOLO lo que aparezca (no inventes). Devuelve JSON:
{"resumen": "2-3 frases", "necesidades": ["..."], "sentimiento": "Positivo|Neutral|Negativo", "satisfaccion": "Satisfecho|Neutral|Insatisfecho|Sin señal", "malestar": ["quejas/fricciones si las hay"], "oportunidades": ["mejoras o servicios que BEXT podría ofrecer"]}`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": cfg.apiKey },
    cache: "no-store",
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: contenido || "(sin contenido)" },
      ],
      temperature: 0.2,
      max_tokens: 900,
      response_format: { type: "json_object" },
    }),
  })
  const json = (await res.json().catch(() => null)) as
    | { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
    | null
  if (!res.ok || !json) throw new Error(`Azure OpenAI devolvió ${res.status}: ${json?.error?.message ?? "error"}`)
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error("La IA no devolvió contenido.")
  const parsed = MeetingAnalysisSchema.safeParse(JSON.parse(content))
  if (!parsed.success) throw new Error("La respuesta de la IA no tiene el formato esperado.")
  return parsed.data
}
