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
import { ArrowSyncRegular } from "@fluentui/react-icons"

type MonthPoint = { mes: string; casos: number; horas: number; proyectado: boolean }
type BagRisk = { id: string; name: string; bolsaPct: number | null; semanasParaAgotar: number | null; fechaAgote: string | null }
type Capacity = {
  generatedAt: string
  serie: MonthPoint[]
  proyeccion: { meses: number; tickets: number; horas: number }
  bolsas: BagRisk[]
  totalClientes: number
}

const useStyles = makeStyles({
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: tokens.spacingHorizontalL, marginBottom: tokens.spacingVerticalL },
  kpi: { display: "flex", flexDirection: "column", gap: "2px", padding: tokens.spacingHorizontalL },
  kpiTop: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  kpiVal: { fontSize: "28px", fontWeight: tokens.fontWeightBold, lineHeight: "32px", color: tokens.colorBrandForeground1 },
  bar: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "center", marginBottom: tokens.spacingVerticalL, flexWrap: "wrap" },
  spacer: { flexGrow: 1 },
  center: { display: "flex", justifyContent: "center", padding: tokens.spacingVerticalXXXL },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: tokens.spacingHorizontalL, marginBottom: tokens.spacingVerticalL },
  card: { padding: tokens.spacingHorizontalL, display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  row: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, marginBottom: "3px" },
  mes: { width: "70px", fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3, flexShrink: 0 },
  track: { flexGrow: 1, background: tokens.colorNeutralBackground3, borderRadius: "3px", overflow: "hidden" },
  fill: { height: "14px", borderRadius: "3px" },
  val: { width: "54px", textAlign: "right", fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2, flexShrink: 0 },
  legend: { display: "flex", gap: tokens.spacingHorizontalL, fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3, marginTop: tokens.spacingVerticalS },
  dot: { display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", marginRight: "4px", verticalAlign: "middle" },
  tableWrap: { overflowX: "auto" },
  link: { color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightSemibold, textDecoration: "none" },
})

const REAL = "#8b2727"
const PROY = "#c98a00"

export function CapacidadView() {
  const styles = useStyles()
  const [data, setData] = useState<Capacity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/analitica/capacidad")
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "No se pudo calcular la proyección")
        return
      }
      setData(json as Capacity)
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
        <Spinner label="Proyectando capacidad…" />
      </div>
    )
  }
  if (error) {
    return (
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>Proyección de capacidad</MessageBarTitle>
          {error}
        </MessageBarBody>
      </MessageBar>
    )
  }
  if (!data) return null

  const maxCasos = Math.max(1, ...data.serie.map((m) => m.casos))
  const maxHoras = Math.max(1, ...data.serie.map((m) => m.horas))
  const bolsasCriticas = data.bolsas.filter((b) => b.semanasParaAgotar != null && b.semanasParaAgotar <= 6).length

  const Serie = ({ titulo, get, max, unidad }: { titulo: string; get: (m: MonthPoint) => number; max: number; unidad: string }) => (
    <Card className={styles.card}>
      <Subtitle2>{titulo}</Subtitle2>
      <div>
        {data.serie.map((m) => (
          <div key={m.mes} className={styles.row}>
            <span className={styles.mes}>{m.mes}</span>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${(get(m) / max) * 100}%`, background: m.proyectado ? PROY : REAL, opacity: m.proyectado ? 0.85 : 1 }} />
            </div>
            <span className={styles.val}>{get(m)}{unidad}</span>
          </div>
        ))}
      </div>
      <div className={styles.legend}>
        <span><span className={styles.dot} style={{ background: REAL }} />Real</span>
        <span><span className={styles.dot} style={{ background: PROY }} />Proyectado</span>
      </div>
    </Card>
  )

  return (
    <>
      <div className={styles.kpis}>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Tickets próx. {data.proyeccion.meses} meses (est.)</span>
          <span className={styles.kpiVal}>{data.proyeccion.tickets}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Horas próx. {data.proyeccion.meses} meses (est.)</span>
          <span className={styles.kpiVal}>{data.proyeccion.horas}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Bolsas por agotarse (≤6 sem)</span>
          <span className={styles.kpiVal} style={{ color: "#c0392b" }}>{bolsasCriticas}</span>
        </Card>
      </div>

      <div className={styles.bar}>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          Tendencia lineal sobre los últimos meses · generado {new Date(data.generatedAt).toLocaleString("es-CO")}
        </Text>
        <div className={styles.spacer} />
        <Button appearance="subtle" icon={<ArrowSyncRegular />} onClick={load}>Recargar</Button>
      </div>

      {data.serie.length === 0 ? (
        <MessageBar intent="info">
          <MessageBarBody>
            <MessageBarTitle>Sin datos suficientes</MessageBarTitle>
            No hay tickets sincronizados para proyectar. A medida que se sincronice GLPI, la proyección se poblará.
          </MessageBarBody>
        </MessageBar>
      ) : (
        <div className={styles.grid2}>
          <Serie titulo="Volumen de tickets / mes" get={(m) => m.casos} max={maxCasos} unidad="" />
          <Serie titulo="Consumo de horas / mes" get={(m) => m.horas} max={maxHoras} unidad="h" />
        </div>
      )}

      <Card className={styles.card}>
        <Subtitle2>Bolsas de horas — orden por urgencia</Subtitle2>
        {data.bolsas.length === 0 ? (
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Ningún cliente tiene bolsa de horas con consumo registrado todavía.
          </Text>
        ) : (
          <div className={styles.tableWrap}>
            <Table size="small">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Consumida</TableHeaderCell>
                  <TableHeaderCell>Semanas restantes</TableHeaderCell>
                  <TableHeaderCell>Agote estimado</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.bolsas.map((b) => {
                  const crit = b.semanasParaAgotar != null && b.semanasParaAgotar <= 6
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Link className={styles.link} href={`/clientes/${b.id}`}>{b.name}</Link>
                      </TableCell>
                      <TableCell>{b.bolsaPct != null ? `${b.bolsaPct}%` : "—"}</TableCell>
                      <TableCell>
                        <Badge appearance="tint" color={crit ? "danger" : "informative"}>
                          {b.semanasParaAgotar === 0 ? "agotada" : `~${b.semanasParaAgotar} sem`}
                        </Badge>
                      </TableCell>
                      <TableCell>{b.fechaAgote ?? "—"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </>
  )
}
