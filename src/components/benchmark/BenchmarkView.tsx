"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  makeStyles,
  tokens,
  Card,
  Text,
  Subtitle2,
  Button,
  Spinner,
  Badge,
  Switch,
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
import { ArrowSyncRegular, StarFilled, WarningRegular } from "@fluentui/react-icons"

type BenchmarkClient = {
  id: string
  name: string
  estrategico: boolean
  score: number | null
  tickets: number
  horas: number
  csat: number | null
  slaPct: number
  adopcion: string | null
  flags: string[]
}
type Cohort = {
  industria: string
  n: number
  comparable: boolean
  medTickets: number
  medHoras: number
  avgCsat: number | null
  avgSla: number
  medScore: number | null
  clientes: BenchmarkClient[]
}
type Benchmark = {
  generatedAt: string
  totalClientes: number
  totalOutliers: number
  cohortes: Cohort[]
}

const useStyles = makeStyles({
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: tokens.spacingHorizontalL, marginBottom: tokens.spacingVerticalL },
  kpi: { display: "flex", flexDirection: "column", gap: "2px", padding: tokens.spacingHorizontalL },
  kpiTop: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  kpiVal: { fontSize: "28px", fontWeight: tokens.fontWeightBold, lineHeight: "32px" },
  bar: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "center", marginBottom: tokens.spacingVerticalL, flexWrap: "wrap" },
  spacer: { flexGrow: 1 },
  center: { display: "flex", justifyContent: "center", padding: tokens.spacingVerticalXXXL },
  cohort: { padding: tokens.spacingHorizontalL, display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM, marginBottom: tokens.spacingVerticalL },
  cohortHead: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, flexWrap: "wrap" },
  medianas: { display: "flex", gap: tokens.spacingHorizontalL, flexWrap: "wrap", color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  tableWrap: { overflowX: "auto" },
  link: { color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightSemibold, textDecoration: "none" },
  cliente: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXS },
  flags: { display: "flex", gap: tokens.spacingHorizontalXS, flexWrap: "wrap" },
  scoreChip: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "22px", borderRadius: "5px", color: "#fff", fontWeight: tokens.fontWeightBold, fontSize: tokens.fontSizeBase200 },
})

const bg = (s: number | null) => (s == null ? "#8a8886" : s >= 70 ? "#1f9d55" : s >= 40 ? "#c98a00" : "#c0392b")
const fmt = (n: number | null) => (n == null ? "—" : String(n))

export function BenchmarkView() {
  const styles = useStyles()
  const [data, setData] = useState<Benchmark | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [soloOutliers, setSoloOutliers] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/analitica/benchmark")
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "No se pudo calcular el benchmark")
        return
      }
      setData(json as Benchmark)
    } catch {
      setError("Error de red")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className={styles.center}>
        <Spinner label="Comparando clientes contra sus pares…" />
      </div>
    )
  }
  if (error) {
    return (
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>Benchmark</MessageBarTitle>
          {error}
        </MessageBarBody>
      </MessageBar>
    )
  }
  if (!data) return null

  const cohortesVisibles = soloOutliers
    ? data.cohortes
        .map((c) => ({ ...c, clientes: c.clientes.filter((x) => x.flags.length > 0) }))
        .filter((c) => c.clientes.length > 0)
    : data.cohortes

  return (
    <>
      <div className={styles.kpis}>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Clientes</span>
          <span className={styles.kpiVal}>{data.totalClientes}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Cohortes (industrias)</span>
          <span className={styles.kpiVal}>{data.cohortes.length}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Con alertas vs pares</span>
          <span className={styles.kpiVal} style={{ color: "#c0392b" }}>{data.totalOutliers}</span>
        </Card>
      </div>

      <div className={styles.bar}>
        <Switch label="Solo clientes con alertas" checked={soloOutliers} onChange={(_, d) => setSoloOutliers(d.checked)} />
        <div className={styles.spacer} />
        <Button appearance="subtle" icon={<ArrowSyncRegular />} onClick={load}>Recargar</Button>
      </div>

      {cohortesVisibles.length === 0 && (
        <MessageBar intent="info">
          <MessageBarBody>
            <MessageBarTitle>Sin resultados</MessageBarTitle>
            {soloOutliers ? "Ningún cliente supera los umbrales frente a su cohorte." : "No hay clientes vinculados a GLPI todavía."}
          </MessageBarBody>
        </MessageBar>
      )}

      {cohortesVisibles.map((c) => (
        <Card key={c.industria} className={styles.cohort}>
          <div className={styles.cohortHead}>
            <Subtitle2>{c.industria}</Subtitle2>
            <Badge appearance="tint" color="informative">{c.n} cliente{c.n !== 1 ? "s" : ""}</Badge>
            {!c.comparable && (
              <Badge appearance="tint" color="subtle">cohorte pequeña — sin comparación fiable</Badge>
            )}
          </div>
          {c.comparable && (
            <div className={styles.medianas}>
              <span>Mediana tickets: <b>{c.medTickets}</b></span>
              <span>Mediana horas: <b>{c.medHoras}</b></span>
              <span>CSAT prom.: <b>{fmt(c.avgCsat)}</b></span>
              <span>SLA incumplido prom.: <b>{c.avgSla}%</b></span>
              <span>Salud mediana: <b>{fmt(c.medScore)}</b></span>
            </div>
          )}
          <div className={styles.tableWrap}>
            <Table size="small">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Salud</TableHeaderCell>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Tickets</TableHeaderCell>
                  <TableHeaderCell>Horas</TableHeaderCell>
                  <TableHeaderCell>CSAT</TableHeaderCell>
                  <TableHeaderCell>SLA incump.</TableHeaderCell>
                  <TableHeaderCell>Alertas vs pares</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.clientes.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell>
                      <span className={styles.scoreChip} style={{ background: bg(x.score) }}>{x.score ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <div className={styles.cliente}>
                        {x.estrategico && <StarFilled color="#c98a00" />}
                        <Link className={styles.link} href={`/clientes/${x.id}`}>{x.name}</Link>
                      </div>
                    </TableCell>
                    <TableCell>{x.tickets}</TableCell>
                    <TableCell>{x.horas}</TableCell>
                    <TableCell>{fmt(x.csat)}</TableCell>
                    <TableCell>{x.slaPct}%</TableCell>
                    <TableCell>
                      {x.flags.length === 0 ? (
                        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>—</Text>
                      ) : (
                        <div className={styles.flags}>
                          {x.flags.map((f) => (
                            <Badge key={f} appearance="tint" color="danger" icon={<WarningRegular />}>{f}</Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ))}

      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
        Generado {new Date(data.generatedAt).toLocaleString("es-CO")} · una cohorte necesita ≥3 clientes para comparar.
      </Text>
    </>
  )
}
