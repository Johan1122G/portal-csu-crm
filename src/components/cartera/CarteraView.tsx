"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  makeStyles,
  tokens,
  Card,
  Text,
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
import { ArrowSyncRegular, StarFilled } from "@fluentui/react-icons"

type PortfolioRow = {
  id: string
  name: string
  estado: string | null
  estrategico: boolean
  score: number
  color: "verde" | "amarillo" | "rojo"
  topRiesgo: string | null
  bolsaPct: number | null
  semanasParaAgotar: number | null
  proximaRenovacionDias: number | null
  diasSinContacto: number | null
  totalTickets: number
  sincronizado: boolean
}

const useStyles = makeStyles({
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: tokens.spacingHorizontalL, marginBottom: tokens.spacingVerticalL },
  kpi: { display: "flex", flexDirection: "column", gap: "2px", padding: tokens.spacingHorizontalL },
  kpiTop: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  kpiVal: { fontSize: "28px", fontWeight: tokens.fontWeightBold, lineHeight: "32px" },
  bar: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "center", marginBottom: tokens.spacingVerticalL, flexWrap: "wrap" },
  spacer: { flexGrow: 1 },
  center: { display: "flex", justifyContent: "center", padding: tokens.spacingVerticalXXXL },
  card: { padding: tokens.spacingHorizontalL },
  tableWrap: { overflowX: "auto" },
  scoreChip: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "38px", height: "26px", borderRadius: "6px", color: "#fff", fontWeight: tokens.fontWeightBold, fontSize: tokens.fontSizeBase200 },
  cliente: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXS },
  link: { color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightSemibold, textDecoration: "none" },
})

const bg = (c: string) => (c === "verde" ? "#1f9d55" : c === "amarillo" ? "#c98a00" : "#c0392b")

export function CarteraView() {
  const styles = useStyles()
  const [rows, setRows] = useState<PortfolioRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [soloRiesgo, setSoloRiesgo] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/analitica/cartera")
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "No se pudo cargar la cartera")
        return
      }
      setRows(json.rows as PortfolioRow[])
    } catch {
      setError("Error de red")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const kpis = useMemo(() => {
    const r = rows ?? []
    return {
      enRiesgo: r.filter((x) => x.color === "rojo").length,
      renovaciones: r.filter((x) => x.proximaRenovacionDias != null && x.proximaRenovacionDias <= 30).length,
      bolsas: r.filter((x) => x.semanasParaAgotar != null && x.semanasParaAgotar <= 6).length,
      total: r.length,
    }
  }, [rows])

  const visibles = useMemo(() => {
    const r = rows ?? []
    return soloRiesgo ? r.filter((x) => x.color !== "verde") : r
  }, [rows, soloRiesgo])

  if (loading) {
    return (
      <div className={styles.center}>
        <Spinner label="Calculando la salud de todos los clientes…" />
      </div>
    )
  }
  if (error) {
    return (
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>Cartera</MessageBarTitle>
          {error}
        </MessageBarBody>
      </MessageBar>
    )
  }
  if (!rows) return null

  return (
    <>
      <div className={styles.kpis}>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Clientes</span>
          <span className={styles.kpiVal}>{kpis.total}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>En riesgo (rojo)</span>
          <span className={styles.kpiVal} style={{ color: "#c0392b" }}>{kpis.enRiesgo}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Renovaciones ≤30 días</span>
          <span className={styles.kpiVal} style={{ color: "#c98a00" }}>{kpis.renovaciones}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Bolsas por agotarse (≤6 sem)</span>
          <span className={styles.kpiVal} style={{ color: "#c98a00" }}>{kpis.bolsas}</span>
        </Card>
      </div>

      <div className={styles.bar}>
        <Switch label="Solo en riesgo" checked={soloRiesgo} onChange={(_, d) => setSoloRiesgo(d.checked)} />
        <div className={styles.spacer} />
        <Button appearance="subtle" icon={<ArrowSyncRegular />} onClick={load}>
          Recargar
        </Button>
      </div>

      <Card className={styles.card}>
        <div className={styles.tableWrap}>
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Salud</TableHeaderCell>
                <TableHeaderCell>Cliente</TableHeaderCell>
                <TableHeaderCell>Principal riesgo</TableHeaderCell>
                <TableHeaderCell>Bolsa</TableHeaderCell>
                <TableHeaderCell>Renovación</TableHeaderCell>
                <TableHeaderCell>Sin contacto</TableHeaderCell>
                <TableHeaderCell>Tickets</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.map((x) => (
                <TableRow key={x.id}>
                  <TableCell>
                    <span className={styles.scoreChip} style={{ background: bg(x.color) }}>
                      {x.score}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className={styles.cliente}>
                      {x.estrategico && <StarFilled color="#c98a00" />}
                      <Link className={styles.link} href={`/clientes/${x.id}`}>
                        {x.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>{x.topRiesgo ?? "—"}</TableCell>
                  <TableCell>
                    {x.bolsaPct != null ? (
                      <Badge appearance="tint" color={x.semanasParaAgotar != null && x.semanasParaAgotar <= 6 ? "danger" : "informative"}>
                        {x.bolsaPct}%
                        {x.semanasParaAgotar != null && x.semanasParaAgotar <= 6 ? ` · ~${x.semanasParaAgotar}sem` : ""}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {x.proximaRenovacionDias != null ? (
                      <Badge appearance="tint" color={x.proximaRenovacionDias <= 30 ? "danger" : "warning"}>
                        {x.proximaRenovacionDias < 0 ? "vencido" : `${x.proximaRenovacionDias}d`}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{x.diasSinContacto != null ? `${x.diasSinContacto}d` : "—"}</TableCell>
                  <TableCell>{x.totalTickets}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </>
  )
}
