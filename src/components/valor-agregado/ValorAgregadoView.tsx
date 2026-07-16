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
import { ArrowSyncRegular, CheckmarkCircleRegular } from "@fluentui/react-icons"

type EstadoEntrega = "vencido" | "proximo" | "alDia" | "sinFecha" | "inactivo"
type Row = {
  id: string
  accountId: string
  cliente: string
  nombre: string
  categoria: string | null
  frecuencia: string
  responsable: string | null
  proximaEntrega: string | null
  ultimaEntrega: string | null
  dias: number | null
  estado: EstadoEntrega
}
type Overview = {
  generatedAt: string
  rows: Row[]
  counts: { vencidos: number; proximos: number; alDia: number; activos: number; total: number }
}

const useStyles = makeStyles({
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: tokens.spacingHorizontalL, marginBottom: tokens.spacingVerticalL },
  kpi: { display: "flex", flexDirection: "column", gap: "2px", padding: tokens.spacingHorizontalL },
  kpiTop: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  kpiVal: { fontSize: "28px", fontWeight: tokens.fontWeightBold, lineHeight: "32px" },
  bar: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "center", marginBottom: tokens.spacingVerticalL, flexWrap: "wrap" },
  spacer: { flexGrow: 1 },
  center: { display: "flex", justifyContent: "center", padding: tokens.spacingVerticalXXXL },
  card: { padding: tokens.spacingHorizontalL },
  tableWrap: { overflowX: "auto" },
  link: { color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightSemibold, textDecoration: "none" },
})

const badgeOf = (e: EstadoEntrega): { color: "danger" | "warning" | "success" | "subtle" | "informative"; label: string } => {
  switch (e) {
    case "vencido": return { color: "danger", label: "Vencido" }
    case "proximo": return { color: "warning", label: "Próximo" }
    case "alDia": return { color: "success", label: "Al día" }
    case "inactivo": return { color: "subtle", label: "Inactivo" }
    default: return { color: "informative", label: "Sin fecha" }
  }
}
const fmtDias = (d: number | null) => (d == null ? "—" : d < 0 ? `vencido hace ${-d}d` : d === 0 ? "hoy" : `en ${d}d`)

export function ValorAgregadoView() {
  const styles = useStyles()
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [soloAlerta, setSoloAlerta] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/valor-agregado")
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "No se pudo cargar")
        return
      }
      setData(json as Overview)
    } catch {
      setError("Error de red")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function entregar(id: string) {
    await fetch(`/api/entregables/${id}/entregar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
    load()
  }

  const visibles = useMemo(() => {
    const r = data?.rows ?? []
    return soloAlerta ? r.filter((x) => x.estado === "vencido" || x.estado === "proximo") : r
  }, [data, soloAlerta])

  if (loading) {
    return (
      <div className={styles.center}>
        <Spinner label="Cargando entregables…" />
      </div>
    )
  }
  if (error) {
    return (
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>Valor agregado</MessageBarTitle>
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
          <span className={styles.kpiTop}>Vencidos</span>
          <span className={styles.kpiVal} style={{ color: "#c0392b" }}>{data.counts.vencidos}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Próximos</span>
          <span className={styles.kpiVal} style={{ color: "#c98a00" }}>{data.counts.proximos}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Al día</span>
          <span className={styles.kpiVal} style={{ color: "#1f9d55" }}>{data.counts.alDia}</span>
        </Card>
        <Card className={styles.kpi}>
          <span className={styles.kpiTop}>Activos</span>
          <span className={styles.kpiVal}>{data.counts.activos}</span>
        </Card>
      </div>

      <div className={styles.bar}>
        <Switch label="Solo vencidos/próximos" checked={soloAlerta} onChange={(_, d) => setSoloAlerta(d.checked)} />
        <div className={styles.spacer} />
        <Button appearance="subtle" icon={<ArrowSyncRegular />} onClick={load}>Recargar</Button>
      </div>

      {data.counts.total === 0 ? (
        <MessageBar intent="info">
          <MessageBarBody>
            <MessageBarTitle>Sin entregables aún</MessageBarTitle>
            Define entregables en la pestaña “Valor agregado” de cada cliente, o cárgalos con el import masivo (hoja “Entregables”).
          </MessageBarBody>
        </MessageBar>
      ) : (
        <Card className={styles.card}>
          <div className={styles.tableWrap}>
            <Table size="small">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Entregable</TableHeaderCell>
                  <TableHeaderCell>Frecuencia</TableHeaderCell>
                  <TableHeaderCell>Próxima</TableHeaderCell>
                  <TableHeaderCell>Responsable</TableHeaderCell>
                  <TableHeaderCell>Acción</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((x) => {
                  const b = badgeOf(x.estado)
                  return (
                    <TableRow key={x.id}>
                      <TableCell><Badge appearance="tint" color={b.color}>{b.label}</Badge></TableCell>
                      <TableCell><Link className={styles.link} href={`/clientes/${x.accountId}`}>{x.cliente}</Link></TableCell>
                      <TableCell>{x.nombre}</TableCell>
                      <TableCell>{x.frecuencia}</TableCell>
                      <TableCell>{x.proximaEntrega ?? "—"} <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>({fmtDias(x.dias)})</Text></TableCell>
                      <TableCell>{x.responsable ?? "—"}</TableCell>
                      <TableCell>
                        <Button appearance="subtle" size="small" icon={<CheckmarkCircleRegular />} disabled={x.estado === "inactivo"} onClick={() => entregar(x.id)}>
                          Entregado
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
        Generado {new Date(data.generatedAt).toLocaleString("es-CO")}
      </Text>
    </>
  )
}
