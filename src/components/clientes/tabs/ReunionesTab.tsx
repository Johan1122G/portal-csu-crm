"use client"

import { useCallback, useEffect, useState } from "react"
import {
  makeStyles,
  tokens,
  Card,
  Text,
  Button,
  Spinner,
  Badge,
  Field,
  Input,
  Tooltip,
  Link as FluentLink,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableBody,
  TableCell,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@fluentui/react-components"
import { ArrowSyncRegular, CalendarLtrRegular, VideoRegular, OpenRegular, SparkleRegular } from "@fluentui/react-icons"
import { format } from "date-fns"
import { EmptyState } from "@/components/shared/EmptyState"

type Person = { name: string; email: string }
type ClientMeeting = {
  id: string
  subject: string
  start: string
  end: string
  organizer: string
  isOnline: boolean
  joinUrl: string | null
  webLink: string | null
  bextParticipants: Person[]
  clientParticipants: Person[]
  tieneAnalisis: boolean
}
type ReunionesResponse = {
  configured: boolean
  ultimoSync: string | null
  meetings: ClientMeeting[]
  note?: string
  proxima?: string | null
  ultima?: string | null
}
type MeetingAnalysis = {
  resumen: string
  necesidades: string[]
  sentimiento: string
  satisfaccion: string
  malestar: string[]
  oportunidades: string[]
}

const useStyles = makeStyles({
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: tokens.spacingHorizontalL, marginBottom: tokens.spacingVerticalL },
  kpi: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalXXS, padding: tokens.spacingHorizontalL },
  kpiTop: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, color: tokens.colorNeutralForeground3 },
  kpiValue: { fontSize: "24px", fontWeight: tokens.fontWeightBold, lineHeight: "30px", color: tokens.colorBrandForeground1 },
  bar: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "flex-end", marginBottom: tokens.spacingVerticalL, flexWrap: "wrap" },
  spacer: { flexGrow: 1 },
  center: { display: "flex", justifyContent: "center", padding: tokens.spacingVerticalXXXL },
  card: { padding: tokens.spacingHorizontalL },
  msg: { marginBottom: tokens.spacingVerticalL },
  tableWrap: { maxHeight: "460px", overflowY: "auto" },
  people: { display: "flex", gap: tokens.spacingHorizontalXS, flexWrap: "wrap" },
  subjectCell: { display: "flex", gap: tokens.spacingHorizontalS, alignItems: "center" },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  analysis: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM, minWidth: "min(560px, 82vw)" },
  alabel: { fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground2 },
})

const fmtDateTime = (d?: string | null) => (d ? format(new Date(d), "dd/MM/yyyy HH:mm") : "—")
const isoDay = (d: Date) => d.toISOString().slice(0, 10)

function People({ people }: { people: Person[] }) {
  const styles = useStyles()
  if (people.length === 0) return <Text>—</Text>
  const shown = people.slice(0, 3)
  const rest = people.length - shown.length
  return (
    <div className={styles.people}>
      {shown.map((p) => (
        <Tooltip key={p.email} content={p.email} relationship="label">
          <Badge appearance="tint" color="informative">{p.name || p.email}</Badge>
        </Tooltip>
      ))}
      {rest > 0 && (
        <Tooltip content={people.slice(3).map((p) => p.name || p.email).join(", ")} relationship="label">
          <Badge appearance="ghost">+{rest}</Badge>
        </Tooltip>
      )}
    </div>
  )
}

export function ReunionesTab({ accountId }: { accountId: string }) {
  const styles = useStyles()
  const [data, setData] = useState<ReunionesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const today = new Date()
  const monthAgo = new Date(today)
  monthAgo.setDate(today.getDate() - 30)
  const [from, setFrom] = useState(isoDay(monthAgo))
  const [to, setTo] = useState(isoDay(today))

  // Análisis de reunión
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [analisis, setAnalisis] = useState<MeetingAnalysis | null>(null)
  const [analisisMsg, setAnalisisMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/clientes/${accountId}/reuniones?from=${from}&to=${to}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "No se pudieron traer las reuniones")
        setData(null)
        return
      }
      setData(json as ReunionesResponse)
    } catch {
      setError("Error de red")
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  useEffect(() => {
    load()
  }, [load])

  async function sincronizar() {
    setSyncing(true)
    try {
      await fetch(`/api/clientes/${accountId}/reuniones`, { method: "POST" })
      await load()
    } finally {
      setSyncing(false)
    }
  }

  async function analizar(m: ClientMeeting) {
    setAnalyzingId(m.id)
    setAnalisis(null)
    setAnalisisMsg(null)
    try {
      // Si ya tiene análisis, traerlo (GET); si no, generarlo (POST).
      const res = await fetch(`/api/clientes/${accountId}/reuniones/${m.id}/analizar`, {
        method: m.tieneAnalisis ? "GET" : "POST",
      })
      const json = await res.json()
      if (json.configured === false) {
        setAnalisisMsg("La IA no está configurada (Azure OpenAI).")
      } else if (json.ok === false) {
        setAnalisisMsg(json.motivo ?? "No se pudo obtener contenido de la reunión.")
      } else if (json.analisis) {
        setAnalisis(json.analisis as MeetingAnalysis)
        if (!m.tieneAnalisis) load() // refresca el indicador
      } else {
        setAnalisisMsg(json.error ?? "No hay análisis disponible.")
      }
      setDialogOpen(true)
    } catch {
      setAnalisisMsg("Error de red al analizar la reunión.")
      setDialogOpen(true)
    } finally {
      setAnalyzingId(null)
    }
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <Spinner label="Cargando reuniones…" />
      </div>
    )
  }
  if (error) {
    return (
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>Reuniones de Teams</MessageBarTitle>
          {error}
        </MessageBarBody>
      </MessageBar>
    )
  }
  if (!data) return null

  if (!data.configured && data.meetings.length === 0) {
    return (
      <MessageBar intent="info">
        <MessageBarBody>
          <MessageBarTitle>Integración con Microsoft Teams pendiente de configurar</MessageBarTitle>
          Configura el App Registration de Microsoft Graph (permisos <b>Calendars.Read</b> y <b>User.Read.All</b> de
          aplicación) y define <code>GRAPH_TENANT_ID</code>, <code>GRAPH_CLIENT_ID</code> y{" "}
          <code>GRAPH_CLIENT_SECRET</code>. Ver <b>DEPLOY.md</b>.
        </MessageBarBody>
      </MessageBar>
    )
  }

  return (
    <>
      {data.note && (
        <MessageBar intent="info" className={styles.msg}>
          <MessageBarBody>{data.note}</MessageBarBody>
        </MessageBar>
      )}

      <div className={styles.kpis}>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}><CalendarLtrRegular /> Próxima reunión</span>
          <span className={styles.kpiValue}>{fmtDateTime(data.proxima)}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}><CalendarLtrRegular /> Última reunión</span>
          <span className={styles.kpiValue}>{fmtDateTime(data.ultima)}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Interacciones (rango)</span>
          <span className={styles.kpiValue}>{data.meetings.length}</span>
        </Card>
      </div>

      <div className={styles.bar}>
        <Field label="Desde">
          <Input type="date" value={from} onChange={(_, d) => setFrom(d.value)} />
        </Field>
        <Field label="Hasta">
          <Input type="date" value={to} onChange={(_, d) => setTo(d.value)} />
        </Field>
        <Button appearance="secondary" onClick={load}>Aplicar</Button>
        <div className={styles.spacer} />
        {data.ultimoSync && <Text className={styles.hint}>Último sync: {fmtDateTime(data.ultimoSync)}</Text>}
        <Button appearance="primary" icon={<ArrowSyncRegular />} onClick={sincronizar} disabled={syncing}>
          {syncing ? "Sincronizando…" : "Sincronizar reuniones"}
        </Button>
      </div>

      <Card className={styles.card}>
        {data.meetings.length === 0 ? (
          <EmptyState
            title="Sin reuniones en caché"
            description="Pulsa “Sincronizar reuniones” para traer las reuniones de Teams entre BEXT y este cliente."
          />
        ) : (
          <div className={styles.tableWrap}>
            <Table size="small">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Fecha y hora</TableHeaderCell>
                  <TableHeaderCell>Asunto</TableHeaderCell>
                  <TableHeaderCell>Participantes BEXT</TableHeaderCell>
                  <TableHeaderCell>Participantes cliente</TableHeaderCell>
                  <TableHeaderCell>Enlace</TableHeaderCell>
                  <TableHeaderCell>Análisis IA</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.meetings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{fmtDateTime(m.start)}</TableCell>
                    <TableCell>
                      <div className={styles.subjectCell}>
                        {m.isOnline && <VideoRegular />}
                        {m.subject}
                      </div>
                    </TableCell>
                    <TableCell><People people={m.bextParticipants} /></TableCell>
                    <TableCell><People people={m.clientParticipants} /></TableCell>
                    <TableCell>
                      {m.joinUrl ? (
                        <FluentLink href={m.joinUrl} target="_blank">Unirse <OpenRegular /></FluentLink>
                      ) : m.webLink ? (
                        <FluentLink href={m.webLink} target="_blank">Abrir <OpenRegular /></FluentLink>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        appearance={m.tieneAnalisis ? "subtle" : "secondary"}
                        size="small"
                        icon={<SparkleRegular />}
                        disabled={analyzingId === m.id}
                        onClick={() => analizar(m)}
                      >
                        {analyzingId === m.id ? "…" : m.tieneAnalisis ? "Ver análisis" : "Analizar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(_, d) => setDialogOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Análisis de la reunión</DialogTitle>
            <DialogContent>
              {analisisMsg ? (
                <MessageBar intent="info"><MessageBarBody>{analisisMsg}</MessageBarBody></MessageBar>
              ) : analisis ? (
                <div className={styles.analysis}>
                  <div><span className={styles.alabel}>Resumen:</span> {analisis.resumen}</div>
                  <div>
                    <span className={styles.alabel}>Sentimiento:</span>{" "}
                    <Badge appearance="tint" color={/posit/i.test(analisis.sentimiento) ? "success" : /negat/i.test(analisis.sentimiento) ? "danger" : "warning"}>
                      {analisis.sentimiento}
                    </Badge>{"  "}
                    <span className={styles.alabel}>Satisfacción:</span>{" "}
                    <Badge appearance="tint" color={/insatis/i.test(analisis.satisfaccion) ? "danger" : /satisf/i.test(analisis.satisfaccion) ? "success" : "subtle"}>
                      {analisis.satisfaccion}
                    </Badge>
                  </div>
                  {analisis.necesidades.length > 0 && (
                    <div><span className={styles.alabel}>Necesidades:</span><ul>{analisis.necesidades.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                  )}
                  {analisis.malestar.length > 0 && (
                    <div><span className={styles.alabel}>Señales de malestar:</span><ul>{analisis.malestar.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                  )}
                  {analisis.oportunidades.length > 0 && (
                    <div><span className={styles.alabel}>Oportunidades:</span><ul>{analisis.oportunidades.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                  )}
                </div>
              ) : (
                <Spinner label="Analizando…" />
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDialogOpen(false)}>Cerrar</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  )
}
