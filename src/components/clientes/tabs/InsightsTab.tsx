"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  makeStyles,
  tokens,
  Card,
  Text,
  Subtitle2,
  Body1,
  Button,
  Spinner,
  Badge,
  Field,
  Input,
  Textarea,
  Divider,
  Dropdown,
  Option,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableBody,
  TableCell,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from "@fluentui/react-components"
import { ArrowSyncRegular, SparkleRegular, AddRegular } from "@fluentui/react-icons"

// ── Tipos (espejo de los endpoints) ──────────────────────────────────────────
type CategoriaAgg = { categoria: string; casos: number; pct: number; horas: number; csatPromedio: number | null; resolucionPromedioHoras: number | null }
type MesAgg = { mes: string; casos: number; horas: number }
type EstadoAgg = { estado: string; casos: number }
type RecurrenteAgg = { tema: string; casos: number }
type HealthDriver = { nombre: string; estado: "bueno" | "neutral" | "malo"; detalle: string; subscore: number | null }
type Health = {
  score: number | null
  color: "verde" | "amarillo" | "rojo" | "gris"
  drivers: HealthDriver[]
  bolsa: { contratadas: number | null; consumidas: number | null; pct: number | null; burnRateMensual: number | null; semanasParaAgotar: number | null }
  sla: { incumplidoPct: number; resolucionPromedioHoras: number | null }
  engagement: { ultimaInteraccion: string | null; diasSinContacto: number | null; proximaReunion: string | null; frecuenciaPactada: string | null }
  renovaciones: { producto: string; vence: string; diasRestantes: number; estado: string }[]
}
type Analytics = {
  vinculado: boolean
  sincronizado: boolean
  ultimoSync: string | null
  salud: Health | null
  resumen: {
    totalTickets: number; abiertos: number; cerrados: number; horasTotales: number
    resolucionPromedioHoras: number | null; csatPromedio: number | null; csatRespuestas: number
    categorizacionPct: number; slaIncumplidoPct: number; primerTicket: string | null; ultimoTicket: string | null
  }
  porCategoria: CategoriaAgg[]; porEstado: EstadoAgg[]; tendenciaMensual: MesAgg[]; recurrentes: RecurrenteAgg[]
}
type Finding = { id?: string; titulo: string; tipo: string; evidencia: string; recomendacion: string; impacto: string; confianza: string; servicio?: string | null; serviceCatalogItemId?: string | null }
type ThreadInfo = { id: string; title: string | null; modifiedon: string }

const useStyles = makeStyles({
  bar: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "flex-end", marginBottom: tokens.spacingVerticalL, flexWrap: "wrap" },
  spacer: { flexGrow: 1 },
  actions: { display: "flex", gap: tokens.spacingHorizontalS, alignItems: "flex-end", flexWrap: "wrap" },
  center: { display: "flex", justifyContent: "center", padding: tokens.spacingVerticalXXXL },
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: tokens.spacingHorizontalM, marginBottom: tokens.spacingVerticalL },
  kpi: { display: "flex", flexDirection: "column", gap: "2px", padding: tokens.spacingHorizontalM },
  kpiTop: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  kpiVal: { fontSize: "24px", fontWeight: tokens.fontWeightBold, color: tokens.colorBrandForeground1, lineHeight: "28px" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: tokens.spacingHorizontalL, marginBottom: tokens.spacingVerticalL },
  card: { padding: tokens.spacingHorizontalL, display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  msg: { marginBottom: tokens.spacingVerticalL },
  trendRow: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, marginBottom: "3px" },
  trendMes: { width: "62px", fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3, flexShrink: 0 },
  trendBar: { height: "14px", background: tokens.colorBrandBackground2, borderRadius: "3px", minWidth: "2px" },
  trendVal: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2 },
  estados: { display: "flex", gap: tokens.spacingHorizontalS, flexWrap: "wrap" },
  health: { padding: tokens.spacingHorizontalL, display: "flex", gap: tokens.spacingHorizontalXL, alignItems: "center", marginBottom: tokens.spacingVerticalL, flexWrap: "wrap" },
  scoreCircle: { width: "92px", height: "92px", borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" },
  scoreNum: { fontSize: "30px", fontWeight: tokens.fontWeightBold, lineHeight: "32px" },
  scoreLbl: { fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.9 },
  drivers: { display: "flex", flexDirection: "column", gap: "4px", flexGrow: 1, minWidth: "240px" },
  driverRow: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  dot: { width: "9px", height: "9px", borderRadius: "50%", flexShrink: 0 },
  driverName: { fontWeight: tokens.fontWeightSemibold, minWidth: "150px" },
  driverDetail: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  csmGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: tokens.spacingHorizontalL, marginBottom: tokens.spacingVerticalL },
  iaSection: { marginTop: tokens.spacingVerticalXL, paddingTop: tokens.spacingVerticalL, borderTop: `2px solid ${tokens.colorNeutralStroke2}`, display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  iaHead: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  presets: { display: "flex", gap: tokens.spacingHorizontalS, flexWrap: "wrap" },
  chat: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS, maxHeight: "420px", overflowY: "auto", padding: tokens.spacingHorizontalXS },
  bubbleUser: { alignSelf: "flex-end", background: tokens.colorBrandBackground2, color: tokens.colorNeutralForeground1, padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`, borderRadius: "10px", maxWidth: "85%", whiteSpace: "pre-wrap" },
  bubbleAI: { alignSelf: "flex-start", background: tokens.colorNeutralBackground3, padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`, borderRadius: "10px", maxWidth: "92%", whiteSpace: "pre-wrap" },
  askRow: { display: "flex", gap: tokens.spacingHorizontalS, alignItems: "flex-end" },
  askInput: { flexGrow: 1 },
  finding: { padding: tokens.spacingHorizontalL, display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS, borderLeft: `3px solid ${tokens.colorBrandStroke1}` },
  fHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: tokens.spacingHorizontalM, flexWrap: "wrap" },
  fBadges: { display: "flex", gap: tokens.spacingHorizontalXS, flexWrap: "wrap" },
  fLabel: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightSemibold },
})

const impactoColor = (i: string): "danger" | "warning" | "success" =>
  /alto/i.test(i) ? "danger" : /medio/i.test(i) ? "warning" : "success"
const prioridadFromImpacto = (i: string) => (/alto/i.test(i) ? "Alta" : /bajo/i.test(i) ? "Baja" : "Media")
const fmtNum = (n: number | null) => (n == null ? "—" : String(n))
const healthBg = (c: string) => (c === "verde" ? "#1f9d55" : c === "amarillo" ? "#c98a00" : c === "gris" ? "#8a8886" : "#c0392b")
const dotColor = (e: string) => (e === "bueno" ? "#1f9d55" : e === "neutral" ? "#c98a00" : "#c0392b")

export function InsightsTab({ accountId }: { accountId: string }) {
  const styles = useStyles()
  const router = useRouter()
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const [findings, setFindings] = useState<Finding[] | null>(null)
  const [ultimoAnalisis, setUltimoAnalisis] = useState<string | null>(null)
  const [aiState, setAiState] = useState<"idle" | "loading" | "unconfigured">("idle")
  const [aiNote, setAiNote] = useState<string | null>(null)
  const [created, setCreated] = useState<Record<string, boolean>>({})

  // Q&A persistente (chat tipo Copilot)
  const [conv, setConv] = useState<{ role: "user" | "assistant"; content: string }[]>([])
  const [pregunta, setPregunta] = useState("")
  const [asking, setAsking] = useState(false)
  const [qaUnconfigured, setQaUnconfigured] = useState(false)
  const [threads, setThreads] = useState<ThreadInfo[]>([])
  const [threadId, setThreadId] = useState<string | null>(null)

  // Carga lo GUARDADO (hallazgos + conversaciones) sin consumir tokens.
  const loadSaved = useCallback(async () => {
    try {
      const [fi, th] = await Promise.all([
        fetch(`/api/clientes/${accountId}/insights`).then((r) => r.json()),
        fetch(`/api/clientes/${accountId}/threads`).then((r) => r.json()),
      ])
      if (fi.configured === false) setAiState("unconfigured")
      setFindings(fi.findings ?? [])
      setUltimoAnalisis(fi.ultimoAnalisis ?? null)
      const ths: ThreadInfo[] = th.threads ?? []
      setThreads(ths)
      if (ths[0]) {
        const t = await fetch(`/api/clientes/${accountId}/threads/${ths[0].id}`).then((r) => r.json())
        setThreadId(ths[0].id)
        setConv(t.messages ?? [])
      }
    } catch {
      /* silencioso: la analítica determinística ya cargó */
    }
  }, [accountId])

  useEffect(() => {
    loadSaved()
  }, [loadSaved])

  async function refreshThreads() {
    const th = await fetch(`/api/clientes/${accountId}/threads`).then((r) => r.json())
    setThreads(th.threads ?? [])
  }
  async function abrirThread(id: string) {
    const t = await fetch(`/api/clientes/${accountId}/threads/${id}`).then((r) => r.json())
    setThreadId(id)
    setConv(t.messages ?? [])
  }
  function nuevaConversacion() {
    setThreadId(null)
    setConv([])
  }

  const qs = () => {
    const p = new URLSearchParams()
    if (from) p.set("from", from)
    if (to) p.set("to", to)
    return p.toString() ? `?${p}` : ""
  }

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/clientes/${accountId}/analitica${qs()}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "No se pudo cargar la analítica")
        setData(null)
        return
      }
      setData(json as Analytics)
    } catch {
      setError("Error de red")
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  async function sincronizar() {
    setSyncing(true)
    try {
      await fetch(`/api/analitica/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: accountId }),
      })
      await loadAnalytics()
    } finally {
      setSyncing(false)
    }
  }

  async function generar() {
    setAiState("loading")
    setAiNote(null)
    setFindings(null)
    setCreated({})
    try {
      const res = await fetch(`/api/clientes/${accountId}/insights${qs()}`, { method: "POST" })
      const json = await res.json()
      if (json.configured === false) {
        setAiState("unconfigured")
        return
      }
      if (!res.ok) {
        setAiNote(json.error ?? "No se pudieron generar los hallazgos")
        setAiState("idle")
        return
      }
      setFindings(json.findings ?? [])
      setUltimoAnalisis(json.ultimoAnalisis ?? null)
      setCreated({})
      if (json.note) setAiNote(json.note)
      setAiState("idle")
    } catch {
      setAiNote("Error de red al generar hallazgos")
      setAiState("idle")
    }
  }

  async function crearOportunidad(f: Finding) {
    const key = f.id ?? f.titulo
    const body = {
      accountId,
      name: f.titulo,
      cr_bex_origen: "Analítica IA",
      cr_bex_impacto: f.impacto,
      prioritycode: prioridadFromImpacto(f.impacto),
      cr_bex_accionrequerida: `${f.recomendacion}\n\nEvidencia: ${f.evidencia}`,
      statecode: "Pendiente",
      serviceCatalogItemId: f.serviceCatalogItemId ?? undefined,
    }
    const res = await fetch(`/api/oportunidades`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setCreated((c) => ({ ...c, [key]: true }))
      router.refresh()
    }
  }

  async function preguntar(texto: string) {
    const q = texto.trim()
    if (!q || asking) return
    setAsking(true)
    setPregunta("")
    setConv((c) => [...c, { role: "user", content: q }])
    try {
      const res = await fetch(`/api/clientes/${accountId}/preguntar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: q, threadId }),
      })
      const json = await res.json()
      if (json.configured === false) {
        setQaUnconfigured(true)
        return
      }
      if (json.threadId) {
        const isNew = json.threadId !== threadId
        setThreadId(json.threadId)
        if (isNew) refreshThreads()
      }
      setConv((c) => [...c, { role: "assistant", content: json.respuesta ?? json.error ?? "No pude responder." }])
    } catch {
      setConv((c) => [...c, { role: "assistant", content: "Error de red al consultar la IA." }])
    } finally {
      setAsking(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <Spinner label="Cargando analítica…" />
      </div>
    )
  }
  if (error) {
    return (
      <MessageBar intent="warning">
        <MessageBarBody><MessageBarTitle>Analítica</MessageBarTitle>{error}</MessageBarBody>
      </MessageBar>
    )
  }
  if (!data) return null

  if (!data.vinculado) {
    return (
      <MessageBar intent="info">
        <MessageBarBody>
          <MessageBarTitle>Sin vínculo con GLPI</MessageBarTitle>
          Este cliente no está vinculado a una entidad de GLPI. Sincronízalo desde GLPI primero para tener
          datos de soporte que analizar.
        </MessageBarBody>
      </MessageBar>
    )
  }

  const r = data.resumen
  const maxMes = Math.max(1, ...data.tendenciaMensual.map((m) => m.casos))
  const topCat = data.porCategoria.find((c) => !c.categoria.startsWith("("))
  const presets = [
    "Dame los 5 hallazgos y oportunidades más importantes de este cliente.",
    ...(topCat ? [`Ahonda en los casos de "${topCat.categoria}".`] : []),
    "¿Qué problemas de seguridad o cumplimiento se repiten?",
    "Resume los tickets con peor tiempo de resolución.",
  ]
  // Hallazgos agrupados por tipo (#3).
  const findingsByTipo = new Map<string, Finding[]>()
  for (const f of findings ?? []) {
    const k = f.tipo || "Otro"
    if (!findingsByTipo.has(k)) findingsByTipo.set(k, [])
    findingsByTipo.get(k)!.push(f)
  }
  const fmtFecha = (s: string | null) => (s ? new Date(s).toLocaleString("es-CO") : null)

  return (
    <>
      <div className={styles.bar}>
        <Field label="Desde"><Input type="date" value={from} onChange={(_, d) => setFrom(d.value)} /></Field>
        <Field label="Hasta"><Input type="date" value={to} onChange={(_, d) => setTo(d.value)} /></Field>
        <Button appearance="secondary" icon={<ArrowSyncRegular />} onClick={loadAnalytics}>Aplicar</Button>
        <div className={styles.spacer} />
        <div className={styles.actions}>
          <Button appearance="secondary" icon={<ArrowSyncRegular />} onClick={sincronizar} disabled={syncing}>
            {syncing ? "Sincronizando…" : "Sincronizar analítica"}
          </Button>
        </div>
      </div>

      {data.ultimoSync && (
        <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: "block", marginBottom: 12 }}>
          Último sync: {new Date(data.ultimoSync).toLocaleString("es-CO")}
        </Text>
      )}

      {!data.sincronizado ? (
        <MessageBar intent="info">
          <MessageBarBody>
            <MessageBarTitle>Sin datos sincronizados</MessageBarTitle>
            Pulsa “Sincronizar analítica” para traer los tickets de GLPI de este cliente y calcular las métricas.
          </MessageBarBody>
        </MessageBar>
      ) : (
        <>
          {/* Health Score */}
          {data.salud && (
            <Card className={styles.health}>
              <div className={styles.scoreCircle} style={{ background: healthBg(data.salud.color) }}>
                <span className={styles.scoreNum}>{data.salud.score ?? "—"}</span>
                <span className={styles.scoreLbl}>{data.salud.color === "gris" ? "Sin datos" : "Salud"}</span>
              </div>
              <div className={styles.drivers}>
                {data.salud.drivers.map((d) => (
                  <div key={d.nombre} className={styles.driverRow}>
                    <span className={styles.dot} style={{ background: dotColor(d.estado) }} />
                    <span className={styles.driverName}>{d.nombre}</span>
                    <span className={styles.driverDetail}>{d.detalle}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Módulos CSM: bolsa, SLA, engagement, renovaciones */}
          {data.salud && (
            <div className={styles.csmGrid}>
              <Card className={styles.card}>
                <Subtitle2>Bolsa de horas</Subtitle2>
                <Body1>
                  {data.salud.bolsa.contratadas != null ? (
                    <>
                      <b>{data.salud.bolsa.consumidas ?? "—"}</b> / {data.salud.bolsa.contratadas} h
                      {data.salud.bolsa.pct != null && ` (${data.salud.bolsa.pct}%)`}
                    </>
                  ) : (
                    "Sin bolsa registrada"
                  )}
                </Body1>
                {data.salud.bolsa.burnRateMensual != null && (
                  <Text size={200}>Ritmo: {data.salud.bolsa.burnRateMensual} h/mes</Text>
                )}
                {data.salud.bolsa.semanasParaAgotar != null && (
                  <Badge appearance="tint" color={data.salud.bolsa.semanasParaAgotar <= 6 ? "danger" : "informative"}>
                    {data.salud.bolsa.semanasParaAgotar === 0
                      ? "Bolsa agotada"
                      : `~${data.salud.bolsa.semanasParaAgotar} semanas para agotar`}
                  </Badge>
                )}
              </Card>

              <Card className={styles.card}>
                <Subtitle2>SLA / calidad</Subtitle2>
                <Body1>
                  SLA incumplido: <b>{data.salud.sla.incumplidoPct}%</b>
                </Body1>
                <Text size={200}>Resolución promedio: {fmtNum(data.salud.sla.resolucionPromedioHoras)} h</Text>
              </Card>

              <Card className={styles.card}>
                <Subtitle2>Engagement</Subtitle2>
                <Body1>
                  {data.salud.engagement.diasSinContacto != null
                    ? `${data.salud.engagement.diasSinContacto} días sin contacto`
                    : "Sin interacciones registradas"}
                </Body1>
                <Text size={200}>
                  Próxima reunión: {data.salud.engagement.proximaReunion ?? "sin agendar"}
                  {data.salud.engagement.frecuenciaPactada && ` · pactada: ${data.salud.engagement.frecuenciaPactada}`}
                </Text>
              </Card>

              <Card className={styles.card}>
                <Subtitle2>Renovaciones próximas</Subtitle2>
                {data.salud.renovaciones.length === 0 ? (
                  <Body1>Sin renovaciones en los próximos 120 días</Body1>
                ) : (
                  data.salud.renovaciones.map((r, i) => (
                    <div key={i} className={styles.driverRow}>
                      <Badge appearance="tint" color={r.diasRestantes <= 30 ? "danger" : "warning"}>
                        {r.diasRestantes < 0 ? `vencido` : `${r.diasRestantes}d`}
                      </Badge>
                      <Text size={200}>{r.producto} ({r.vence})</Text>
                    </div>
                  ))
                )}
              </Card>
            </div>
          )}

          {/* KPIs */}
          <div className={styles.kpis}>
            <Card className={styles.kpi}><span className={styles.kpiTop}>Tickets</span><span className={styles.kpiVal}>{r.totalTickets}</span></Card>
            <Card className={styles.kpi}><span className={styles.kpiTop}>Abiertos / Cerrados</span><span className={styles.kpiVal}>{r.abiertos}/{r.cerrados}</span></Card>
            <Card className={styles.kpi}><span className={styles.kpiTop}>Horas totales</span><span className={styles.kpiVal}>{r.horasTotales}</span></Card>
            <Card className={styles.kpi}><span className={styles.kpiTop}>Resolución prom. (h)</span><span className={styles.kpiVal}>{fmtNum(r.resolucionPromedioHoras)}</span></Card>
            <Card className={styles.kpi}><span className={styles.kpiTop}>CSAT prom. ({r.csatRespuestas})</span><span className={styles.kpiVal}>{fmtNum(r.csatPromedio)}</span></Card>
            <Card className={styles.kpi}><span className={styles.kpiTop}>% categorizado</span><span className={styles.kpiVal}>{r.categorizacionPct}%</span></Card>
          </div>

          {r.categorizacionPct < 50 && (
            <MessageBar intent="warning" className={styles.msg}>
              <MessageBarBody>
                Solo el <b>{r.categorizacionPct}%</b> de los tickets está categorizado en GLPI. El análisis por
                categoría será parcial; mejorar la categorización es en sí una oportunidad de proceso.
              </MessageBarBody>
            </MessageBar>
          )}

          <div className={styles.grid2}>
            {/* Por categoría */}
            <Card className={styles.card}>
              <Subtitle2>Por categoría</Subtitle2>
              <Table size="small">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Categoría</TableHeaderCell>
                    <TableHeaderCell>Casos</TableHeaderCell>
                    <TableHeaderCell>%</TableHeaderCell>
                    <TableHeaderCell>Horas</TableHeaderCell>
                    <TableHeaderCell>CSAT</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.porCategoria.map((c) => (
                    <TableRow key={c.categoria}>
                      <TableCell>{c.categoria}</TableCell>
                      <TableCell>{c.casos}</TableCell>
                      <TableCell>{c.pct}%</TableCell>
                      <TableCell>{c.horas}</TableCell>
                      <TableCell>{fmtNum(c.csatPromedio)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Tendencia mensual */}
            <Card className={styles.card}>
              <Subtitle2>Tendencia mensual</Subtitle2>
              <div>
                {data.tendenciaMensual.length === 0 ? (
                  <Text>—</Text>
                ) : (
                  data.tendenciaMensual.map((m) => (
                    <div key={m.mes} className={styles.trendRow}>
                      <span className={styles.trendMes}>{m.mes}</span>
                      <div className={styles.trendBar} style={{ width: `${(m.casos / maxMes) * 100}%` }} />
                      <span className={styles.trendVal}>{m.casos}</span>
                    </div>
                  ))
                )}
              </div>
              <div>
                <span className={styles.fLabel}>Estados: </span>
                <span className={styles.estados}>
                  {data.porEstado.map((e) => (
                    <Badge key={e.estado} appearance="tint" color="informative">{e.estado}: {e.casos}</Badge>
                  ))}
                </span>
              </div>
            </Card>
          </div>

          {/* Recurrentes */}
          {data.recurrentes.length > 0 && (
            <Card className={styles.card} style={{ marginBottom: tokens.spacingVerticalL }}>
              <Subtitle2>Asuntos recurrentes</Subtitle2>
              {data.recurrentes.map((rec) => (
                <div key={rec.tema} className={styles.trendRow}>
                  <Badge appearance="tint" color="brand">{rec.casos}×</Badge>
                  <Text>{rec.tema}</Text>
                </div>
              ))}
            </Card>
          )}

          {/* ─── Asistente IA (al fondo) ─────────────────────────────────── */}
          <div className={styles.iaSection}>
            <div className={styles.iaHead}>
              <SparkleRegular />
              <Subtitle2>Asistente IA</Subtitle2>
            </div>

            {(aiState === "unconfigured" || qaUnconfigured) && (
              <MessageBar intent="info">
                <MessageBarBody>
                  <MessageBarTitle>IA pendiente de configurar</MessageBarTitle>
                  Define <code>AZURE_OPENAI_ENDPOINT</code>, <code>AZURE_OPENAI_API_KEY</code> y{" "}
                  <code>AZURE_OPENAI_DEPLOYMENT</code>. Los agregados de arriba ya funcionan sin IA.
                </MessageBarBody>
              </MessageBar>
            )}

            {/* Hallazgos estructurados (guardados, agrupados por tipo) → crear oportunidad */}
            <div className={styles.iaHead}>
              <Button
                appearance="primary"
                icon={<SparkleRegular />}
                onClick={generar}
                disabled={aiState === "loading" || r.totalTickets === 0}
              >
                {aiState === "loading"
                  ? "Generando…"
                  : findings && findings.length > 0
                    ? "Actualizar hallazgos"
                    : "Generar hallazgos clave"}
              </Button>
              {ultimoAnalisis && (
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  Último análisis: {fmtFecha(ultimoAnalisis)}
                </Text>
              )}
            </div>
            {aiNote && (
              <MessageBar intent="info">
                <MessageBarBody>{aiNote}</MessageBarBody>
              </MessageBar>
            )}
            {Array.from(findingsByTipo.entries()).map(([tipo, items]) => (
              <div key={tipo} style={{ display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS }}>
                <Badge appearance="tint" color="brand">{tipo} ({items.length})</Badge>
                {items.map((f) => {
                  const key = f.id ?? f.titulo
                  return (
                    <Card key={key} className={styles.finding}>
                      <div className={styles.fHead}>
                        <Text weight="semibold">{f.titulo}</Text>
                        <div className={styles.fBadges}>
                          <Badge appearance="tint" color={impactoColor(f.impacto)}>Impacto {f.impacto}</Badge>
                          <Badge appearance="outline">Confianza {f.confianza}</Badge>
                        </div>
                      </div>
                      <div><span className={styles.fLabel}>Evidencia: </span><Body1>{f.evidencia}</Body1></div>
                      <div><span className={styles.fLabel}>Recomendación: </span><Body1>{f.recomendacion}</Body1></div>
                      {f.servicio && (
                        <div>
                          <span className={styles.fLabel}>Servicio sugerido: </span>
                          <Badge appearance="tint" color={f.serviceCatalogItemId ? "success" : "subtle"}>
                            {f.servicio}
                          </Badge>
                        </div>
                      )}
                      <div>
                        <Button appearance="primary" size="small" icon={<AddRegular />} disabled={created[key]} onClick={() => crearOportunidad(f)}>
                          {created[key] ? "Oportunidad creada ✓" : "Crear oportunidad"}
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            ))}

            <Divider />

            {/* Chat persistente tipo Copilot */}
            <div className={styles.iaHead}>
              <Text weight="semibold">Pregúntale lo que quieras sobre este cliente</Text>
              <div className={styles.spacer} />
              {threads.length > 0 && (
                <Dropdown
                  size="small"
                  placeholder="Conversaciones"
                  selectedOptions={threadId ? [threadId] : []}
                  value={threadId ? threads.find((t) => t.id === threadId)?.title ?? "Conversación" : ""}
                  onOptionSelect={(_, d) => d.optionValue && abrirThread(d.optionValue)}
                >
                  {threads.map((t) => (
                    <Option key={t.id} value={t.id} text={t.title ?? "Conversación"}>
                      {t.title ?? "Conversación"}
                    </Option>
                  ))}
                </Dropdown>
              )}
              <Button appearance="subtle" size="small" onClick={nuevaConversacion}>
                Nueva conversación
              </Button>
            </div>
            <div className={styles.presets}>
              {presets.map((p) => (
                <Button key={p} appearance="subtle" size="small" disabled={asking} onClick={() => preguntar(p)}>
                  {p}
                </Button>
              ))}
            </div>

            {conv.length > 0 && (
              <div className={styles.chat}>
                {conv.map((m, i) => (
                  <div key={i} className={m.role === "user" ? styles.bubbleUser : styles.bubbleAI}>
                    {m.content}
                  </div>
                ))}
                {asking && <div className={styles.bubbleAI}>Pensando…</div>}
              </div>
            )}

            <div className={styles.askRow}>
              <Textarea
                className={styles.askInput}
                placeholder="Ej: ¿qué problemas de seguridad se repiten? ¿en qué categoría se va más tiempo?"
                value={pregunta}
                onChange={(_, d) => setPregunta(d.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    preguntar(pregunta)
                  }
                }}
                resize="vertical"
              />
              <Button appearance="primary" onClick={() => preguntar(pregunta)} disabled={asking || !pregunta.trim()}>
                {asking ? "…" : "Preguntar"}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
