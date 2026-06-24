// Cliente REST de GLPI 10.x — replica los patrones probados en producción de BEXT:
// auth con App-Token + user_token, paginación con &range= y el quirk de que GLPI
// devuelve { message } (no un array vacío) cuando no hay más datos.

export type GlpiEntity = {
  id: number
  name: string
  completename?: string
  entities_id?: number | string
  registration_number?: string
  address?: string
  town?: string
  state?: string
  country?: string
  website?: string
  phonenumber?: string
  email?: string
  comment?: string
}

type GlpiConfig = { url: string; appToken: string; userToken: string }

function readConfig(): GlpiConfig {
  const url = process.env.GLPI_URL
  const appToken = process.env.GLPI_APP_TOKEN
  const userToken = process.env.GLPI_USER_TOKEN
  if (!url || !appToken || !userToken || appToken.startsWith("<") || userToken.startsWith("<")) {
    throw new Error(
      "GLPI no está configurado. Define GLPI_URL, GLPI_APP_TOKEN y GLPI_USER_TOKEN en el .env.",
    )
  }
  // Solo para GLPI interno con certificado self-signed (no recomendado en prod expuesta).
  if (process.env.GLPI_INSECURE_TLS === "true") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
  }
  return { url: url.replace(/\/+$/, ""), appToken, userToken }
}

async function initSession(cfg: GlpiConfig): Promise<string> {
  const res = await fetch(`${cfg.url}/apirest.php/initSession`, {
    method: "GET",
    headers: { "App-Token": cfg.appToken, Authorization: `user_token ${cfg.userToken}` },
    cache: "no-store",
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GLPI initSession falló (${res.status}): ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as { session_token?: string }
  if (!json.session_token) throw new Error("GLPI initSession no devolvió session_token")
  return json.session_token
}

async function killSession(cfg: GlpiConfig, sessionToken: string): Promise<void> {
  try {
    await fetch(`${cfg.url}/apirest.php/killSession`, {
      method: "GET",
      headers: { "App-Token": cfg.appToken, "Session-Token": sessionToken },
      cache: "no-store",
    })
  } catch {
    // best-effort: no romper si el cierre falla
  }
}

// Paginación robusta: GLPI devuelve { message } cuando no hay más datos (no [] ).
async function getBulk<T>(cfg: GlpiConfig, sessionToken: string, path: string): Promise<T[]> {
  const headers = { "App-Token": cfg.appToken, "Session-Token": sessionToken }
  const all: T[] = []
  const lote = 100
  let inicio = 0
  const sep = path.includes("?") ? "&" : "?"

  while (true) {
    const uri = `${cfg.url}/apirest.php/${path}${sep}range=${inicio}-${inicio + lote - 1}`
    let res: Response
    try {
      res = await fetch(uri, { method: "GET", headers, cache: "no-store" })
    } catch {
      break
    }
    // 400/206/200 — 400 puede significar "sin datos" en algunos recursos.
    if (!res.ok && res.status !== 206) break

    const data: unknown = await res.json().catch(() => null)
    if (data == null) break
    // { message: "..." } => no hay más datos
    if (!Array.isArray(data)) {
      if (typeof data === "object" && data !== null && "message" in data) break
      // objeto suelto inesperado: lo envolvemos
      all.push(data as T)
      break
    }
    if (data.length === 0) break
    all.push(...(data as T[]))
    if (data.length < lote) break
    inicio += lote
  }
  return all
}

// Trae todas las entidades de GLPI (recursivo, con nombres legibles).
export async function fetchGlpiEntities(): Promise<GlpiEntity[]> {
  const cfg = readConfig()
  const session = await initSession(cfg)
  try {
    return await getBulk<GlpiEntity>(
      cfg,
      session,
      "Entity?expand_dropdowns=true&is_recursive=true",
    )
  } finally {
    await killSession(cfg, session)
  }
}

// ─── Tickets por cliente (search API) ──────────────────────────────────────────
// El header Glpi-Entity NO filtra el endpoint Ticket en esta instancia (devuelve
// todo). La search API con criterio sobre entities_id (field 80) sí filtra.
// Campos search relevantes: 2=id, 1=asunto, 12=status, 15=fecha, 45=actiontime(seg).

export type ClientTicket = {
  id: number
  subject: string
  status: number
  statusLabel: string
  date: string
  horas: number
}
export type ClientTicketStats = {
  total: number
  horasConsumidas: number
  abiertos: number
  cerrados: number
  tickets: ClientTicket[]
}

const TICKET_STATUS: Record<number, string> = {
  1: "Nuevo",
  2: "En curso",
  3: "Planificado",
  4: "Pendiente",
  5: "Resuelto",
  6: "Cerrado",
}

function decodeBasic(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
}

type SearchResponse = { totalcount?: number; data?: Record<string, unknown>[] }

// Suma actiontime (horas consumidas) y cuenta estados de todos los tickets de una
// entidad GLPI; devuelve la lista completa de tickets (ordenada por fecha desc).
export async function fetchClientTickets(entityId: string): Promise<ClientTicketStats> {
  const cfg = readConfig()
  const session = await initSession(cfg)
  const headers = { "App-Token": cfg.appToken, "Session-Token": session }
  const base =
    `criteria[0][field]=80&criteria[0][searchtype]=equals&criteria[0][value]=${encodeURIComponent(entityId)}` +
    `&forcedisplay[0]=2&forcedisplay[1]=1&forcedisplay[2]=12&forcedisplay[3]=15&forcedisplay[4]=45` +
    `&sort=15&order=DESC`

  let total = 0
  let totalSeconds = 0
  let abiertos = 0
  let cerrados = 0
  const tickets: ClientTicket[] = []
  const lote = 100
  let start = 0
  let totalcount = Infinity

  try {
    while (start < totalcount) {
      const uri = `${cfg.url}/apirest.php/search/Ticket?${base}&range=${start}-${start + lote - 1}`
      let res: Response
      try {
        res = await fetch(uri, { method: "GET", headers, cache: "no-store" })
      } catch {
        break
      }
      if (!res.ok && res.status !== 206) break
      const json = (await res.json().catch(() => null)) as SearchResponse | null
      if (!json) break
      totalcount = Number(json.totalcount ?? 0)
      const rows = json.data ?? []
      if (rows.length === 0) break

      for (const row of rows) {
        const status = Number(row["12"] ?? 0)
        const seconds = Number(row["45"] ?? 0) || 0
        total++
        totalSeconds += seconds
        if (status >= 5) cerrados++
        else abiertos++
        tickets.push({
          id: Number(row["2"]),
          subject: decodeBasic(String(row["1"] ?? "")),
          status,
          statusLabel: TICKET_STATUS[status] ?? String(status),
          date: String(row["15"] ?? ""),
          horas: Math.round((seconds / 3600) * 100) / 100,
        })
      }
      start += lote
      if (rows.length < lote) break
    }

    return {
      total,
      horasConsumidas: Math.round((totalSeconds / 3600) * 10) / 10,
      abiertos,
      cerrados,
      tickets,
    }
  } finally {
    await killSession(cfg, session)
  }
}

// ─── Hechos detallados por ticket (para la tabla de hechos de analítica) ─────────
// Igual que fetchClientTickets pero trae los campos para análisis: categoría (7),
// fecha cierre (16), fecha solución (17) y CSAT (62). Devuelve fechas crudas de
// GLPI ("YYYY-MM-DD HH:MM:SS"); el sync las parsea.

export type GlpiTicketFactRow = {
  glpiTicketId: number
  subject: string
  content: string | null
  category: string | null
  status: number
  openedAt: string | null
  closedAt: string | null
  solvedAt: string | null
  actiontimeSeconds: number
  satisfaction: number | null
  isLate: boolean
}

const cleanStr = (v: unknown): string | null => {
  const s = decodeBasic(String(v ?? "")).trim()
  return s === "" ? null : s
}

// ─── Resolución de categorías (corrige el bug de categorías "eliminadas") ────────
// La search API resuelve el nombre de categoría por un JOIN: si la categoría fue
// borrada en GLPI, devuelve null aunque el ticket SÍ esté categorizado. Por eso
// traemos el itilcategories_id CRUDO (GET /Ticket) y resolvemos el nombre con un
// diccionario de categorías (GET /ITILCategory). Si el id existe pero la categoría
// fue eliminada → "(categoría eliminada)" (cuenta como categorizado, no como vacío).

const CATEGORIA_ELIMINADA = "(categoría eliminada)"

// Diccionario id→completename de todas las categorías visibles (cacheado en memoria).
let categoryNameCache: Map<number, string> | null = null
async function getCategoryNameMap(cfg: GlpiConfig, session: string): Promise<Map<number, string>> {
  if (categoryNameCache) return categoryNameCache
  const cats = await getBulk<{ id: number; completename?: string; name?: string }>(
    cfg,
    session,
    "ITILCategory?is_recursive=true",
  )
  const m = new Map<number, string>()
  for (const c of cats) {
    const nombre = decodeBasic(String(c.completename ?? c.name ?? "")).trim()
    if (c.id != null && nombre) m.set(Number(c.id), nombre)
  }
  categoryNameCache = m
  return m
}

// Quita HTML/entidades y trunca (para guardar la descripción del ticket).
// OJO: GLPI devuelve el contenido entity-encoded (&lt;p&gt;), así que primero se
// decodifican las entidades y DESPUÉS se quitan los tags reales.
function htmlToText(s: unknown, max = 1500): string | null {
  const decoded = decodeBasic(String(s ?? "").replace(/&nbsp;/gi, " "))
  const t = decoded
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (t === "") return null
  return t.length > max ? t.slice(0, max) + "…" : t
}

// Mapa ticketId→{categoría cruda + descripción} de una entidad, vía GET /Ticket.
// searchText[entities_id] filtra por LIKE, así que se valida la entidad exacta.
async function fetchEntityRawMap(
  cfg: GlpiConfig,
  session: string,
  entityId: string,
): Promise<Map<number, { catId: number; content: string | null }>> {
  const headers = { "App-Token": cfg.appToken, "Session-Token": session }
  const map = new Map<number, { catId: number; content: string | null }>()
  const eid = Number(entityId)
  const lote = 200
  let start = 0
  while (true) {
    const uri = `${cfg.url}/apirest.php/Ticket?searchText[entities_id]=${encodeURIComponent(entityId)}&range=${start}-${start + lote - 1}`
    let res: Response
    try {
      res = await fetch(uri, { method: "GET", headers, cache: "no-store" })
    } catch {
      break
    }
    if (!res.ok && res.status !== 206) break
    const data: unknown = await res.json().catch(() => null)
    if (!Array.isArray(data) || data.length === 0) break
    for (const t of data as { id: number; entities_id?: number; itilcategories_id?: number; content?: string }[]) {
      if (Number(t.entities_id) !== eid) continue // searchText es LIKE → filtrar exacto
      map.set(Number(t.id), { catId: Number(t.itilcategories_id ?? 0), content: htmlToText(t.content) })
    }
    if (data.length < lote) break
    start += lote
  }
  return map
}

export async function fetchClientTicketFacts(entityId: string): Promise<GlpiTicketFactRow[]> {
  const cfg = readConfig()
  const session = await initSession(cfg)
  const headers = { "App-Token": cfg.appToken, "Session-Token": session }
  // forcedisplay: 2=id,1=asunto,7=categoría,12=estado,15=apertura,16=cierre,17=solución,45=actiontime,62=CSAT
  const base =
    `criteria[0][field]=80&criteria[0][searchtype]=equals&criteria[0][value]=${encodeURIComponent(entityId)}` +
    `&forcedisplay[0]=2&forcedisplay[1]=1&forcedisplay[2]=7&forcedisplay[3]=12` +
    `&forcedisplay[4]=15&forcedisplay[5]=16&forcedisplay[6]=17&forcedisplay[7]=45&forcedisplay[8]=62` +
    `&forcedisplay[9]=82` +
    `&sort=15&order=DESC`

  const rows: GlpiTicketFactRow[] = []
  const lote = 100
  let start = 0
  let totalcount = Infinity

  try {
    // Categoría (id crudo + diccionario) y descripción por ticket (ver nota arriba).
    const [nameMap, rawMap] = await Promise.all([
      getCategoryNameMap(cfg, session),
      fetchEntityRawMap(cfg, session, entityId),
    ])
    while (start < totalcount) {
      const uri = `${cfg.url}/apirest.php/search/Ticket?${base}&range=${start}-${start + lote - 1}`
      let res: Response
      try {
        res = await fetch(uri, { method: "GET", headers, cache: "no-store" })
      } catch {
        break
      }
      if (!res.ok && res.status !== 206) break
      const json = (await res.json().catch(() => null)) as SearchResponse | null
      if (!json) break
      totalcount = Number(json.totalcount ?? 0)
      const data = json.data ?? []
      if (data.length === 0) break

      for (const row of data) {
        const sat = Number(row["62"] ?? 0)
        const ticketId = Number(row["2"])
        // Resolver categoría por id crudo; fallback al nombre de la search si el
        // raw pull no trajo el ticket (no debería, pero por robustez).
        const raw = rawMap.get(ticketId)
        let category: string | null
        if (raw) {
          category = raw.catId > 0 ? (nameMap.get(raw.catId) ?? CATEGORIA_ELIMINADA) : null
        } else {
          category = cleanStr(row["7"])
        }
        rows.push({
          glpiTicketId: ticketId,
          subject: decodeBasic(String(row["1"] ?? "")),
          content: raw?.content ?? null,
          category,
          status: Number(row["12"] ?? 0),
          openedAt: cleanStr(row["15"]),
          closedAt: cleanStr(row["16"]),
          solvedAt: cleanStr(row["17"]),
          actiontimeSeconds: Number(row["45"] ?? 0) || 0,
          satisfaction: Number.isFinite(sat) && sat > 0 ? sat : null,
          isLate: Number(row["82"] ?? 0) > 0,
        })
      }
      start += lote
      if (data.length < lote) break
    }
    return rows
  } finally {
    await killSession(cfg, session)
  }
}
