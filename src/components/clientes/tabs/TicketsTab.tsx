"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  makeStyles,
  tokens,
  Card,
  Text,
  Button,
  Spinner,
  Badge,
  Checkbox,
  Field,
  Input,
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
import { ArrowSyncRegular, ClockRegular } from "@fluentui/react-icons"
import { format } from "date-fns"
import { EmptyState } from "@/components/shared/EmptyState"

type ClientTicket = {
  id: number
  subject: string
  status: number
  statusLabel: string
  date: string
  horas: number
}
type TicketsResponse = {
  total: number
  horasConsumidas: number
  abiertos: number
  cerrados: number
  tickets: ClientTicket[]
  incluidos: number[]
}

const useStyles = makeStyles({
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: tokens.spacingHorizontalL, marginBottom: tokens.spacingVerticalL },
  kpi: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalXXS, padding: tokens.spacingHorizontalL },
  kpiTop: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, color: tokens.colorNeutralForeground3 },
  kpiValue: { fontSize: "30px", fontWeight: tokens.fontWeightBold, lineHeight: "34px", color: tokens.colorBrandForeground1 },
  filterCard: { padding: tokens.spacingHorizontalL, marginBottom: tokens.spacingVerticalL },
  filterRow: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "flex-end", flexWrap: "wrap" },
  selectBtns: { display: "flex", gap: tokens.spacingHorizontalS, alignItems: "center", flexWrap: "wrap" },
  spacer: { flexGrow: 1 },
  bar: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "center", marginBottom: tokens.spacingVerticalL, flexWrap: "wrap" },
  center: { display: "flex", justifyContent: "center", padding: tokens.spacingVerticalXXXL },
  card: { padding: tokens.spacingHorizontalL },
  msg: { marginBottom: tokens.spacingVerticalL },
  tableWrap: { maxHeight: "440px", overflowY: "auto" },
  checkCol: { width: "44px" },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
})

function statusColor(status: number): "success" | "warning" | "informative" {
  if (status >= 5) return "success"
  if (status === 4) return "warning"
  return "informative"
}

// Fecha de GLPI viene "YYYY-MM-DD HH:MM:SS"; comparar por día (string) basta.
const dayOf = (d: string) => (d ? d.slice(0, 10) : "")

export function TicketsTab({ accountId }: { accountId: string }) {
  const styles = useStyles()
  const router = useRouter()
  const [data, setData] = useState<TicketsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState<number | null>(null)

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setApplied(null)
    try {
      const res = await fetch(`/api/clientes/${accountId}/tickets`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "No se pudieron traer los tickets")
        setData(null)
        return
      }
      const resp = json as TicketsResponse
      setData(resp)
      // Selección inicial: la persistida si existe; si nunca se ha guardado, todos.
      const ids: number[] = resp.incluidos.length > 0 ? resp.incluidos : resp.tickets.map((t) => t.id)
      setSelected(new Set(ids))
    } catch {
      setError("Error de red al consultar GLPI")
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    load()
  }, [load])

  const horasSeleccionadas = useMemo(() => {
    if (!data) return 0
    const sum = data.tickets.filter((t) => selected.has(t.id)).reduce((s, t) => s + t.horas, 0)
    return Math.round(sum * 10) / 10
  }, [data, selected])

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (data) setSelected(new Set(data.tickets.map((t) => t.id)))
  }
  function selectNone() {
    setSelected(new Set())
  }
  function selectRange() {
    if (!data) return
    const next = new Set<number>()
    for (const t of data.tickets) {
      const d = dayOf(t.date)
      if (!d) continue
      if (desde && d < desde) continue
      if (hasta && d > hasta) continue
      next.add(t.id)
    }
    setSelected(next)
  }

  async function aplicarHoras() {
    setApplying(true)
    setApplied(null)
    try {
      const res = await fetch(`/api/clientes/${accountId}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketIds: Array.from(selected) }),
      })
      const json = await res.json()
      if (res.ok) {
        setApplied(json.cr_bex_horasconsumidas)
        router.refresh()
      } else {
        setError(json.error ?? "No se pudo aplicar")
      }
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <Spinner label="Consultando tickets en GLPI…" />
      </div>
    )
  }

  if (error) {
    return (
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>Tickets GLPI</MessageBarTitle>
          {error}
        </MessageBarBody>
      </MessageBar>
    )
  }

  if (!data) return null

  const horasInt = Math.round(horasSeleccionadas)

  return (
    <>
      {applied !== null && (
        <MessageBar intent="success" className={styles.msg}>
          <MessageBarBody>
            Horas consumidas actualizadas a <b>{applied} h</b> en el cliente (pestaña Soporte / CS). La selección
            quedó guardada.
          </MessageBarBody>
        </MessageBar>
      )}

      <div className={styles.kpis}>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Total tickets</span>
          <span className={styles.kpiValue}>{data.total}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Seleccionados</span>
          <span className={styles.kpiValue}>{selected.size}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>
            <ClockRegular /> Horas seleccionadas
          </span>
          <span className={styles.kpiValue}>{horasSeleccionadas}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Horas histórico (todos)</span>
          <span className={styles.kpiValue}>{data.horasConsumidas}</span>
        </Card>
      </div>

      <Card className={styles.filterCard}>
        <Text weight="semibold" style={{ marginBottom: 8 }}>
          Selección de tickets del contrato actual
        </Text>
        <div className={styles.filterRow}>
          <Field label="Desde">
            <Input type="date" value={desde} onChange={(_, d) => setDesde(d.value)} />
          </Field>
          <Field label="Hasta">
            <Input type="date" value={hasta} onChange={(_, d) => setHasta(d.value)} />
          </Field>
          <Button appearance="secondary" onClick={selectRange}>
            Seleccionar en rango
          </Button>
          <div className={styles.spacer} />
          <div className={styles.selectBtns}>
            <Button appearance="subtle" size="small" onClick={selectAll}>
              Todos
            </Button>
            <Button appearance="subtle" size="small" onClick={selectNone}>
              Ninguno
            </Button>
          </div>
        </div>
        <Text className={styles.hint} style={{ marginTop: 8, display: "block" }}>
          Marca los tickets que componen las horas del contrato vigente. El filtro por rango pre-marca los del
          periodo; puedes ajustar manualmente.
        </Text>
      </Card>

      <div className={styles.bar}>
        <Button appearance="subtle" icon={<ArrowSyncRegular />} onClick={load}>
          Recargar
        </Button>
        <div className={styles.spacer} />
        <Button
          appearance="primary"
          icon={<ClockRegular />}
          onClick={aplicarHoras}
          disabled={applying}
        >
          {applying ? "Aplicando…" : `Aplicar ${horasInt} h a horas consumidas`}
        </Button>
      </div>

      <Card className={styles.card}>
        {data.tickets.length === 0 ? (
          <EmptyState title="Sin tickets" description="Este cliente no tiene tickets en GLPI." />
        ) : (
          <div className={styles.tableWrap}>
            <Table size="small">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell className={styles.checkCol}>
                    <Checkbox
                      checked={
                        selected.size === 0
                          ? false
                          : selected.size === data.tickets.length
                            ? true
                            : "mixed"
                      }
                      onChange={(_, d) => (d.checked ? selectAll() : selectNone())}
                    />
                  </TableHeaderCell>
                  <TableHeaderCell>#</TableHeaderCell>
                  <TableHeaderCell>Asunto</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell>Fecha</TableHeaderCell>
                  <TableHeaderCell>Horas</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tickets.map((t) => (
                  <TableRow key={t.id} appearance={selected.has(t.id) ? "neutral" : "none"}>
                    <TableCell className={styles.checkCol}>
                      <Checkbox checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                    </TableCell>
                    <TableCell>{t.id}</TableCell>
                    <TableCell>{t.subject}</TableCell>
                    <TableCell>
                      <Badge appearance="tint" color={statusColor(t.status)}>
                        {t.statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.date ? format(new Date(t.date), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell>{t.horas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </>
  )
}
