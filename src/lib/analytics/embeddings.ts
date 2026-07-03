// ─── Embeddings + búsqueda semántica (tickets GLPI) ──────────────────────────────
// Indexa asunto+descripción de cada ticket como vector (Azure OpenAI embeddings),
// guardado como JSON. La búsqueda embebe la consulta y rankea por similitud coseno
// en el servidor. Config por env con guard (estado "pendiente" si falta el modelo).

import { createHash } from "node:crypto"
import { prisma } from "@/lib/prisma"

type EmbConfig = { endpoint: string; apiKey: string; deployment: string; apiVersion: string }

const isPlaceholder = (v?: string) => !v || v.startsWith("<") || v.trim() === ""

function tryReadConfig(): EmbConfig | null {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT
  if (isPlaceholder(endpoint) || isPlaceholder(apiKey) || isPlaceholder(deployment)) return null
  return {
    endpoint: endpoint!.replace(/\/+$/, ""),
    apiKey: apiKey!,
    deployment: deployment!,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview",
  }
}

export function isEmbeddingsConfigured(): boolean {
  return tryReadConfig() !== null
}

const hash = (s: string) => createHash("sha1").update(s).digest("hex")
const textOf = (subject: string | null, content: string | null) =>
  `${subject ?? ""}\n${content ?? ""}`.trim().slice(0, 2000)

function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

// Llama a Azure OpenAI embeddings (en lotes). Lanza si no está configurado.
async function embedTexts(texts: string[]): Promise<number[][]> {
  const cfg = tryReadConfig()
  if (!cfg) throw new Error("Embeddings no configurado (AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT).")
  const url = `${cfg.endpoint}/openai/deployments/${cfg.deployment}/embeddings?api-version=${cfg.apiVersion}`
  const out: number[][] = []
  const BATCH = 96
  for (let i = 0; i < texts.length; i += BATCH) {
    const input = texts.slice(i, i + BATCH)
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": cfg.apiKey },
      cache: "no-store",
      body: JSON.stringify({ input }),
    })
    const json = (await res.json().catch(() => null)) as
      | { data?: { embedding: number[]; index: number }[]; error?: { message?: string } }
      | null
    if (!res.ok || !json?.data) {
      throw new Error(`Azure OpenAI embeddings devolvió ${res.status}: ${json?.error?.message ?? "error"}`)
    }
    // Ordena por index para conservar el orden de entrada.
    const sorted = [...json.data].sort((a, b) => a.index - b.index)
    for (const d of sorted) out.push(d.embedding)
  }
  return out
}

export type IndexResult = { total: number; indexados: number; sinCambios: number; sinTexto: number }

// Indexa (o reindexa) los tickets de un cliente. Salta los que no cambiaron (mismo hash).
export async function indexClientTickets(accountId: string): Promise<IndexResult> {
  const cfg = tryReadConfig()
  if (!cfg) throw new Error("Embeddings no configurado.")

  const facts = await prisma.glpiTicketFact.findMany({
    where: { accountId },
    select: { glpiTicketId: true, subject: true, content: true },
  })
  const existentes = await prisma.ticketEmbedding.findMany({
    where: { accountId },
    select: { glpiTicketId: true, textHash: true },
  })
  const hashByTicket = new Map(existentes.map((e) => [e.glpiTicketId, e.textHash]))

  const pend: { glpiTicketId: number; text: string; h: string }[] = []
  let sinTexto = 0
  for (const f of facts) {
    const text = textOf(f.subject, f.content)
    if (!text) {
      sinTexto++
      continue
    }
    const h = hash(text)
    if (hashByTicket.get(f.glpiTicketId) === h) continue // ya indexado, sin cambios
    pend.push({ glpiTicketId: f.glpiTicketId, text, h })
  }

  let indexados = 0
  const CHUNK = 96
  for (let i = 0; i < pend.length; i += CHUNK) {
    const grupo = pend.slice(i, i + CHUNK)
    const vectors = await embedTexts(grupo.map((g) => g.text))
    for (let j = 0; j < grupo.length; j++) {
      const g = grupo[j]
      const vec = vectors[j]
      await prisma.ticketEmbedding.upsert({
        where: { accountId_glpiTicketId: { accountId, glpiTicketId: g.glpiTicketId } },
        create: { accountId, glpiTicketId: g.glpiTicketId, vector: JSON.stringify(vec), dim: vec.length, model: cfg.deployment, textHash: g.h },
        update: { vector: JSON.stringify(vec), dim: vec.length, model: cfg.deployment, textHash: g.h },
      })
      indexados++
    }
  }

  return { total: facts.length, indexados, sinCambios: facts.length - pend.length - sinTexto, sinTexto }
}

// Indexa todos los clientes vinculados a GLPI (secuencial, para no saturar).
export async function indexAll(): Promise<{ clientes: number; indexados: number }> {
  const clientes = await prisma.account.findMany({
    where: { cr_bex_glpientityid: { not: null } },
    select: { id: true },
  })
  let indexados = 0
  for (const c of clientes) {
    const r = await indexClientTickets(c.id)
    indexados += r.indexados
  }
  return { clientes: clientes.length, indexados }
}

export type SearchHit = {
  accountId: string
  cliente: string
  glpiTicketId: number
  subject: string | null
  snippet: string | null
  category: string | null
  openedAt: string | null
  score: number
}

// Búsqueda semántica: embebe la consulta y rankea por coseno. Filtra por cliente si
// se pasa accountId. Devuelve los topK con datos del ticket para mostrar.
export async function searchTickets(input: {
  q: string
  accountId?: string
  topK?: number
}): Promise<SearchHit[]> {
  const cfg = tryReadConfig()
  if (!cfg) throw new Error("Embeddings no configurado.")
  const topK = Math.min(input.topK ?? 20, 50)

  const [qvec] = await embedTexts([input.q.slice(0, 2000)])

  const embeddings = await prisma.ticketEmbedding.findMany({
    where: input.accountId ? { accountId: input.accountId } : {},
    select: { accountId: true, glpiTicketId: true, vector: true },
  })
  if (embeddings.length === 0) return []

  const ranked = embeddings
    .map((e) => ({ accountId: e.accountId, glpiTicketId: e.glpiTicketId, score: cosine(qvec, JSON.parse(e.vector) as number[]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  // Traer detalles de los tickets rankeados + nombres de cliente.
  const facts = await prisma.glpiTicketFact.findMany({
    where: { OR: ranked.map((r) => ({ accountId: r.accountId, glpiTicketId: r.glpiTicketId })) },
    select: { accountId: true, glpiTicketId: true, subject: true, content: true, category: true, openedAt: true },
  })
  const factKey = (a: string, t: number) => `${a}:${t}`
  const factMap = new Map(facts.map((f) => [factKey(f.accountId, f.glpiTicketId), f]))
  const accounts = await prisma.account.findMany({
    where: { id: { in: Array.from(new Set(ranked.map((r) => r.accountId))) } },
    select: { id: true, name: true },
  })
  const nameMap = new Map(accounts.map((a) => [a.id, a.name]))

  return ranked.map((r) => {
    const f = factMap.get(factKey(r.accountId, r.glpiTicketId))
    return {
      accountId: r.accountId,
      cliente: nameMap.get(r.accountId) ?? "—",
      glpiTicketId: r.glpiTicketId,
      subject: f?.subject ?? null,
      snippet: f?.content ? f.content.slice(0, 240) : null,
      category: f?.category ?? null,
      openedAt: f?.openedAt ? f.openedAt.toISOString().slice(0, 10) : null,
      score: Math.round(r.score * 1000) / 1000,
    }
  })
}
