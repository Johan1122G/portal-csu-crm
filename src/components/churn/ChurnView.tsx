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

type ChurnFactor = { factor: string; detalle: string; contribucion: number }
type ChurnClient = {
  id: string
  name: string
  estrategico: boolean
  riesgo: number | null
  banda: "Alto" | "Medio" | "Bajo" | "Sin datos"
  score: number | null
  factores: ChurnFactor[]
}
type Churn = {
  generatedAt: string
  totalClientes: number
  enAlto: number
  enMedio: number
  sinDatos: number
  clientes: ChurnClient[]
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
  riesgoChip: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "42px", height: "26px", borderRadius: "6px", color: "#fff", fontWeight: tokens.fontWeightBold, fontSize: tokens.fontSizeBase200 },
  cliente: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalXS },
  link: { color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightSemibold, textDecoration: "none" },
  factores: { display: "flex", gap: tokens.spacingHorizontalXS, flexWrap: "wrap" },
  note: { marginBottom: tokens.spacingVerticalL },
})

const bandaBg = (b: string) => (b === "Alto" ? "#c0392b" : b === "Medio" ? "#c98a00" : b === "Bajo" ? "#1f9d55" : "#8a8886")

export function ChurnView() {
  const styles = useStyles()
  const [data, setData] = useState<Churn | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [soloRiesgo, setSoloRiesgo] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/analitica/churn")
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "No se pudo calcular el riesgo de fuga")
        return
      }
      setData(json as Churn)
    } catch {
      setError("Error de red")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visibles = useMemo(() => {
    const r = data?.clientes ?? []
    return soloRiesgo ? r.filter((c) => c.banda === "Alto" || c.banda === "Medio") : r
  }, [data, soloRiesgo])

  if (loading) {
    return (
      <div className={styles.center}>
        <Spinner label="Calculando riesgo de fuga…" />
      </div>
    )
  }
  if (error) {
    return (
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>Riesgo de fuga</MessageBarTitle>
          {error}
        </MessageBarBody>
      </MessageBar>
    )
  }
  if (!data) return null

  return (
    <>
      <div className={styles.kpis}>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Clientes</span>
          <span className={styles.kpiVal}>{data.totalClientes}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Riesgo alto</span>
          <span className={styles.kpiVal} style={{ color: "#c0392b" }}>{data.enAlto}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Riesgo medio</span>
          <span className={styles.kpiVal} style={{ color: "#c98a00" }}>{data.enMedio}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Sin datos</span>
          <span className={styles.kpiVal} style={{ color: "#8a8886" }}>{data.sinDatos}</span>
        </Card>
      </div>

      <MessageBar intent="info" className={styles.note}>
        <MessageBarBody>
          Modelo <b>heurístico explicable</b>: combina satisfacción, engagement, tendencia de tickets, adopción,
          bolsa y proximidad de renovación. Un modelo entrenado (histórico de bajas) puede afinarlo más adelante.
        </MessageBarBody>
      </MessageBar>

      <div className={styles.bar}>
        <Switch label="Solo riesgo alto/medio" checked={soloRiesgo} onChange={(_, d) => setSoloRiesgo(d.checked)} />
        <div className={styles.spacer} />
        <Button appearance="subtle" icon={<ArrowSyncRegular />} onClick={load}>Recargar</Button>
      </div>

      <Card className={styles.card}>
        <div className={styles.tableWrap}>
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Riesgo</TableHeaderCell>
                <TableHeaderCell>Banda</TableHeaderCell>
                <TableHeaderCell>Cliente</TableHeaderCell>
                <TableHeaderCell>Salud</TableHeaderCell>
                <TableHeaderCell>Factores principales</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <span className={styles.riesgoChip} style={{ background: bandaBg(c.banda) }}>
                      {c.riesgo ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge appearance="tint" color={c.banda === "Alto" ? "danger" : c.banda === "Medio" ? "warning" : c.banda === "Bajo" ? "success" : "subtle"}>
                      {c.banda}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className={styles.cliente}>
                      {c.estrategico && <StarFilled color="#c98a00" />}
                      <Link className={styles.link} href={`/clientes/${c.id}`}>{c.name}</Link>
                    </div>
                  </TableCell>
                  <TableCell>{c.score ?? "—"}</TableCell>
                  <TableCell>
                    {c.factores.length === 0 ? (
                      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>—</Text>
                    ) : (
                      <div className={styles.factores}>
                        {c.factores.slice(0, 4).map((f) => (
                          <Badge key={f.factor} appearance="tint" color="danger" title={f.detalle}>
                            {f.factor}
                          </Badge>
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

      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
        Generado {new Date(data.generatedAt).toLocaleString("es-CO")}
      </Text>
    </>
  )
}
