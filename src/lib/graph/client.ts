// Cliente de Microsoft Graph (app-only / client credentials) para leer reuniones
// de Teams del calendario del CSM. Patrón espejo del cliente GLPI: la config vive
// en el .env y, si falta, las funciones lanzan un error claro (la UI muestra
// "pendiente de configurar" en vez de romperse).
//
// Permiso requerido en el App Registration: Calendars.Read (Application) con
// consentimiento de administrador. Recomendado: limitar los buzones accesibles
// con una Application Access Policy en Exchange Online.

type GraphConfig = { tenantId: string; clientId: string; clientSecret: string }

const isPlaceholder = (v?: string) => !v || v.startsWith("<") || v.trim() === ""

// Lee la config de Graph. Usa variables GRAPH_* dedicadas y, si no están, cae a
// las del login (AUTH_MICROSOFT_ENTRA_ID_*) — así basta con dar consentimiento al
// mismo App Registration y, opcionalmente, un secret propio para Graph.
function tryReadConfig(): GraphConfig | null {
  const tenantId = process.env.GRAPH_TENANT_ID || process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID
  const clientId = process.env.GRAPH_CLIENT_ID || process.env.AUTH_MICROSOFT_ENTRA_ID_ID
  const clientSecret = process.env.GRAPH_CLIENT_SECRET || process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
  if (isPlaceholder(tenantId) || isPlaceholder(clientId) || isPlaceholder(clientSecret)) return null
  return { tenantId: tenantId!, clientId: clientId!, clientSecret: clientSecret! }
}

// ¿Está la integración con Graph configurada? (sin lanzar — para que la UI decida)
export function isGraphConfigured(): boolean {
  return tryReadConfig() !== null
}

function readConfig(): GraphConfig {
  const cfg = tryReadConfig()
  if (!cfg) {
    throw new Error(
      "La integración con Microsoft Teams no está configurada. Define GRAPH_TENANT_ID, " +
        "GRAPH_CLIENT_ID y GRAPH_CLIENT_SECRET en el .env (o reutiliza el App Registration del login).",
    )
  }
  return cfg
}

// ─── Token (client credentials, cacheado en memoria hasta poco antes de expirar) ──
let cachedToken: { value: string; expiresAt: number } | null = null

async function getAppToken(cfg: GraphConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value

  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  })
  const res = await fetch(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  })
  const json = (await res.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error_description?: string }
    | null
  if (!res.ok || !json?.access_token) {
    throw new Error(`No se pudo obtener token de Graph: ${json?.error_description ?? res.status}`)
  }
  // expires_in viene en segundos; cacheamos hasta ~1 min antes.
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 }
  return cachedToken.value
}

// ─── Reuniones de Teams del calendario de un usuario ─────────────────────────────

export type TeamsMeeting = {
  id: string
  iCalUId: string
  subject: string
  start: string // ISO UTC
  end: string // ISO UTC
  organizer: string
  organizerEmail: string
  isOnline: boolean
  joinUrl: string | null
  webLink: string | null
  attendees: { name: string; email: string }[]
}

type GraphEvent = {
  id: string
  iCalUId?: string
  subject?: string
  start?: { dateTime?: string; timeZone?: string }
  end?: { dateTime?: string; timeZone?: string }
  isOnlineMeeting?: boolean
  onlineMeeting?: { joinUrl?: string } | null
  webLink?: string
  organizer?: { emailAddress?: { name?: string; address?: string } }
  attendees?: { emailAddress?: { name?: string; address?: string } }[]
}

const SELECT = "id,iCalUId,subject,start,end,isOnlineMeeting,onlineMeeting,webLink,organizer,attendees"

// Trae los eventos del calendario de userEmail en la ventana [fromISO, toISO].
// calendarView expande las series recurrentes en instancias individuales.
// Si el usuario no existe (404) devuelve null para que la ruta lo distinga.
export async function fetchUserCalendar(
  userEmail: string,
  fromISO: string,
  toISO: string,
): Promise<TeamsMeeting[] | null> {
  const cfg = readConfig()
  const token = await getAppToken(cfg)
  const headers = { Authorization: `Bearer ${token}` }

  const meetings: TeamsMeeting[] = []
  let url: string | null =
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/calendarView` +
    `?startDateTime=${encodeURIComponent(fromISO)}&endDateTime=${encodeURIComponent(toISO)}` +
    `&$select=${SELECT}&$orderby=start/dateTime&$top=100`

  // Paginación con @odata.nextLink.
  while (url) {
    const res: Response = await fetch(url, { method: "GET", headers, cache: "no-store" })
    if (res.status === 404) return null // buzón no encontrado
    const json = (await res.json().catch(() => null)) as
      | { value?: GraphEvent[]; "@odata.nextLink"?: string; error?: { message?: string } }
      | null
    if (!res.ok || !json) {
      throw new Error(`Graph devolvió ${res.status}: ${json?.error?.message ?? "error desconocido"}`)
    }
    for (const e of json.value ?? []) {
      meetings.push(normalizeEvent(e))
    }
    url = json["@odata.nextLink"] ?? null
  }
  return meetings
}

function normalizeEvent(e: GraphEvent): TeamsMeeting {
  return {
    id: e.id,
    iCalUId: e.iCalUId ?? e.id,
    subject: e.subject?.trim() || "(sin asunto)",
    start: e.start?.dateTime ? `${e.start.dateTime}Z`.replace(/Z+$/, "Z") : "",
    end: e.end?.dateTime ? `${e.end.dateTime}Z`.replace(/Z+$/, "Z") : "",
    isOnline: Boolean(e.isOnlineMeeting),
    joinUrl: e.onlineMeeting?.joinUrl ?? null,
    webLink: e.webLink ?? null,
    organizer: e.organizer?.emailAddress?.name ?? "",
    organizerEmail: (e.organizer?.emailAddress?.address ?? "").toLowerCase(),
    attendees: (e.attendees ?? [])
      .map((a) => ({
        name: a.emailAddress?.name ?? "",
        email: (a.emailAddress?.address ?? "").toLowerCase(),
      }))
      .filter((a) => a.email),
  }
}

// ─── Escaneo de TODO el tenant (interacciones de todo BEXT con un cliente) ───────
// Lista los usuarios habilitados, lee el calendario de cada uno en la ventana,
// filtra las reuniones que cruzan con el cliente (por dominio) y deduplica la
// misma reunión que aparece en varios calendarios (por iCalUId), agregando quién
// de BEXT participó.

const BEXT_DOMAIN = (process.env.GRAPH_BEXT_DOMAIN || "bextsa.com").toLowerCase()
const domainOf = (email: string) => email.split("@")[1]?.toLowerCase() ?? ""

export type ClientMeeting = TeamsMeeting & {
  bextParticipants: { name: string; email: string }[]
  clientParticipants: { name: string; email: string }[]
}

type GraphUser = { mail?: string; userPrincipalName?: string; userType?: string; accountEnabled?: boolean }

// Lista los buzones (miembros habilitados con correo) del tenant.
async function listEnabledMemberUsers(): Promise<string[]> {
  const cfg = readConfig()
  const token = await getAppToken(cfg)
  const headers = { Authorization: `Bearer ${token}` }
  const emails: string[] = []
  let url: string | null =
    "https://graph.microsoft.com/v1.0/users" +
    "?$select=mail,userPrincipalName,userType,accountEnabled" +
    "&$filter=accountEnabled eq true" +
    "&$top=999"
  while (url) {
    const res: Response = await fetch(url, { headers, cache: "no-store" })
    const json = (await res.json().catch(() => null)) as
      | { value?: GraphUser[]; "@odata.nextLink"?: string; error?: { message?: string } }
      | null
    if (res.status === 403) {
      throw new Error(
        "Falta el permiso para listar usuarios. Agrega 'User.Read.All' de APLICACIÓN al App Registration y " +
          "da consentimiento de administrador (necesario para escanear los calendarios de todo BEXT).",
      )
    }
    if (!res.ok || !json) {
      throw new Error(`Graph /users devolvió ${res.status}: ${json?.error?.message ?? "error"}`)
    }
    for (const u of json.value ?? []) {
      const email = (u.mail || u.userPrincipalName || "").toLowerCase()
      // Solo miembros (no invitados) con correo del dominio de BEXT.
      if (email && u.userType !== "Guest" && domainOf(email) === BEXT_DOMAIN) emails.push(email)
    }
    url = json["@odata.nextLink"] ?? null
  }
  return emails
}

// Ejecuta tareas con un límite de concurrencia (evita 100+ fetches simultáneos).
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

// Cache en memoria por (dominios + ventana) con TTL corto: escanear todo el tenant
// es caro, así que recargas rápidas no re-escanean.
const scanCache = new Map<string, { at: number; data: ClientMeeting[] }>()
const SCAN_TTL_MS = 5 * 60 * 1000

export type TenantScanResult = {
  meetings: ClientMeeting[]
  scannedMailboxes: number
}

// Devuelve las reuniones de TODO BEXT con un cliente (dominios), deduplicadas.
export async function fetchTenantMeetingsForClient(
  domains: string[],
  fromISO: string,
  toISO: string,
): Promise<TenantScanResult> {
  const domainSet = new Set(domains.map((d) => d.toLowerCase()))
  const cacheKey = JSON.stringify([Array.from(domainSet).sort(), fromISO, toISO])
  const cached = scanCache.get(cacheKey)
  if (cached && Date.now() - cached.at < SCAN_TTL_MS) {
    return { meetings: cached.data, scannedMailboxes: -1 }
  }

  const mailboxes = await listEnabledMemberUsers()

  // Lee el calendario de cada buzón (con concurrencia). Un buzón que falle (404,
  // sin licencia, etc.) se ignora en vez de tumbar todo el escaneo.
  const perUser = await mapPool(mailboxes, 12, async (email) => {
    try {
      return (await fetchUserCalendar(email, fromISO, toISO)) ?? []
    } catch {
      return [] as TeamsMeeting[]
    }
  })

  // Dedup por iCalUId, quedándose con la copia más completa y agregando participantes.
  const byUid = new Map<string, ClientMeeting>()
  for (const meeting of perUser.flat()) {
    const correos = [meeting.organizerEmail, ...meeting.attendees.map((a) => a.email)]
    // ¿La reunión cruza con el cliente?
    if (!correos.some((c) => domainSet.has(domainOf(c)))) continue

    const all = [
      ...(meeting.organizerEmail
        ? [{ name: meeting.organizer, email: meeting.organizerEmail }]
        : []),
      ...meeting.attendees,
    ]
    const bext = dedupePeople(all.filter((p) => domainOf(p.email) === BEXT_DOMAIN))
    const client = dedupePeople(all.filter((p) => domainSet.has(domainOf(p.email))))

    const existing = byUid.get(meeting.iCalUId)
    if (existing) {
      existing.bextParticipants = dedupePeople([...existing.bextParticipants, ...bext])
      existing.clientParticipants = dedupePeople([...existing.clientParticipants, ...client])
    } else {
      byUid.set(meeting.iCalUId, { ...meeting, bextParticipants: bext, clientParticipants: client })
    }
  }

  const meetings = Array.from(byUid.values()).sort((a, b) => (a.start < b.start ? 1 : -1))
  scanCache.set(cacheKey, { at: Date.now(), data: meetings })
  return { meetings, scannedMailboxes: mailboxes.length }
}

function dedupePeople(people: { name: string; email: string }[]): { name: string; email: string }[] {
  const seen = new Map<string, { name: string; email: string }>()
  for (const p of people) {
    if (!p.email) continue
    if (!seen.has(p.email) || (!seen.get(p.email)!.name && p.name)) seen.set(p.email, p)
  }
  return Array.from(seen.values())
}

// ─── 8b: Transcripción + notas IA (Copilot) de una reunión ───────────────────────
// Mapea joinUrl → onlineMeeting (en el buzón del organizador BEXT), trae la
// transcripción (OnlineMeetingTranscript.Read.All) y las notas IA de Copilot
// (OnlineMeetingAiInsight.Read.All, beta). Resiliente: si falta permiso o dato,
// devuelve un motivo legible en vez de romper.

export type MeetingArtifacts = {
  transcript: string | null
  aiNotes: unknown | null
  motivo?: string // por qué no se pudo (permiso/sin transcripción/etc.)
}

// VTT → texto plano (quita cabecera y líneas de tiempo).
function vttToText(vtt: string): string {
  return vtt
    .split(/\r?\n/)
    .filter((l) => l.trim() && !/^WEBVTT/.test(l) && !/-->/.test(l) && !/^\d+$/.test(l.trim()))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}

export async function fetchMeetingArtifacts(userEmail: string, joinUrl: string): Promise<MeetingArtifacts> {
  const cfg = readConfig()
  const token = await getAppToken(cfg)
  const headers = { Authorization: `Bearer ${token}` }

  // CRÍTICO: onlineMeetings (app-only) solo funciona con el OBJECT ID del usuario,
  // no con el UPN/email (con email devuelve 404). Resolvemos email → id primero.
  let uid = userEmail
  try {
    const ur = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}?$select=id`, {
      headers,
      cache: "no-store",
    })
    const uj = (await ur.json().catch(() => null)) as { id?: string } | null
    if (uj?.id) uid = uj.id
  } catch {
    /* si falla, se intenta con el email */
  }
  const u = encodeURIComponent(uid)

  // 1) joinUrl → onlineMeeting id
  let meetingId: string | null = null
  try {
    const filter = encodeURIComponent(`JoinWebUrl eq '${joinUrl}'`)
    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${u}/onlineMeetings?$filter=${filter}`, {
      headers,
      cache: "no-store",
    })
    if (res.status === 403) return { transcript: null, aiNotes: null, motivo: `Acceso denegado al buzón ${userEmail}. Falta la Application Access Policy de Teams o el permiso OnlineMeetings.Read.All.` }
    if (res.status === 404) {
      // 404/UnknownError al resolver = policy aún no efectiva (propagación) o el buzón no está cubierto.
      return { transcript: null, aiNotes: null, motivo: `No se pudo acceder a la reunión en el buzón ${userEmail}. Suele ser la Application Access Policy aún propagándose (hasta ~1h) o que ese buzón no está incluido en el grant. Reintenta en unos minutos.` }
    }
    const json = (await res.json().catch(() => null)) as { value?: { id: string }[] } | null
    meetingId = json?.value?.[0]?.id ?? null
  } catch {
    return { transcript: null, aiNotes: null, motivo: "No se pudo resolver la reunión en Graph." }
  }
  if (!meetingId) return { transcript: null, aiNotes: null, motivo: "La reunión no se encontró como onlineMeeting (¿no fue por Teams?)." }

  // 2) Transcripción (v1.0)
  let transcript: string | null = null
  let motivoT: string | undefined
  try {
    const lst = await fetch(
      `https://graph.microsoft.com/v1.0/users/${u}/onlineMeetings/${meetingId}/transcripts`,
      { headers, cache: "no-store" },
    )
    if (lst.status === 403) motivoT = "Falta permiso OnlineMeetingTranscript.Read.All."
    else {
      const lj = (await lst.json().catch(() => null)) as { value?: { id: string }[] } | null
      const tid = lj?.value?.[0]?.id
      if (!tid) motivoT = "Sin transcripción (la reunión no se transcribió)."
      else {
        const cont = await fetch(
          `https://graph.microsoft.com/v1.0/users/${u}/onlineMeetings/${meetingId}/transcripts/${tid}/content?$format=text/vtt`,
          { headers, cache: "no-store" },
        )
        if (cont.ok) transcript = vttToText(await cont.text())
      }
    }
  } catch {
    motivoT = "Error trayendo la transcripción."
  }

  // 3) Notas IA de Copilot (beta)
  let aiNotes: unknown | null = null
  let motivoN: string | undefined
  try {
    const ai = await fetch(
      `https://graph.microsoft.com/beta/users/${u}/onlineMeetings/${meetingId}/aiInsights`,
      { headers, cache: "no-store" },
    )
    if (ai.status === 403) motivoN = "Falta permiso OnlineMeetingAiInsight.Read.All."
    else if (ai.ok) {
      const aj = (await ai.json().catch(() => null)) as { value?: unknown[] } | null
      aiNotes = aj?.value?.[0] ?? null
      if (!aiNotes) motivoN = "Sin notas IA (organizador sin Copilot o no generadas)."
    }
  } catch {
    motivoN = "Error trayendo las notas IA."
  }

  const motivo = !transcript && !aiNotes ? [motivoT, motivoN].filter(Boolean).join(" ") || "Sin contenido disponible." : undefined
  return { transcript, aiNotes, motivo }
}
