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
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from "@fluentui/react-components"
import {
  ArrowSyncRegular,
  SparkleRegular,
  WarningRegular,
  CalendarClockRegular,
  ClockRegular,
  PersonQuestionMarkRegular,
} from "@fluentui/react-icons"

type DigestRow = { id: string; name: string; estrategico: boolean; score: number | null; color: "verde" | "amarillo" | "rojo" | "gris"; detalle: string }
type DigestEntregable = { accountId: string; cliente: string; nombre: string; detalle: string; vencido: boolean }
type Digest = {
  generatedAt: string
  totalClientes: number
  sincronizados: number
  sinDatosSalud: number
  buckets: { enRojo: DigestRow[]; renovaciones: DigestRow[]; bolsas: DigestRow[]; sinContacto: DigestRow[]; entregables: DigestEntregable[] }
  intro: string | null
}

const useStyles = makeStyles({
  bar: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "center", marginBottom: tokens.spacingVerticalL, flexWrap: "wrap" },
  spacer: { flexGrow: 1 },
  center: { display: "flex", justifyContent: "center", padding: tokens.spacingVerticalXXXL },
  intro: { padding: tokens.spacingHorizontalL, marginBottom: tokens.spacingVerticalL, borderLeft: `4px solid ${tokens.colorBrandStroke1}`, display: "flex", gap: tokens.spacingHorizontalM, alignItems: "flex-start" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: tokens.spacingHorizontalL },
  card: { padding: tokens.spacingHorizontalL, display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS },
  cardHead: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS },
  count: { marginLeft: "auto" },
  row: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, padding: `${tokens.spacingVerticalXS} 0`, borderBottom: `1px solid ${tokens.colorNeutralStroke3}` },
  chip: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "22px", borderRadius: "5px", color: "#fff", fontWeight: tokens.fontWeightBold, fontSize: tokens.fontSizeBase200, flexShrink: 0 },
  link: { color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightSemibold, textDecoration: "none" },
  detalle: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200, marginLeft: "auto", textAlign: "right" },
  empty: { color: tokens.colorNeutralForeground3, fontStyle: "italic", padding: `${tokens.spacingVerticalS} 0` },
  meta: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
})

const bg = (c: string) => (c === "verde" ? "#1f9d55" : c === "amarillo" ? "#c98a00" : c === "gris" ? "#8a8886" : "#c0392b")

export function DigestView() {
  const styles = useStyles()
  const [data, setData] = useState<Digest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conIntro, setConIntro] = useState(false)

  const load = useCallback(async (intro: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/analitica/digest${intro ? "?intro=1" : ""}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "No se pudo cargar el digest")
        return
      }
      setData(json as Digest)
    } catch {
      setError("Error de red")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(false)
  }, [load])

  if (loading && !data) {
    return (
      <div className={styles.center}>
        <Spinner label="Revisando toda la cartera…" />
      </div>
    )
  }
  if (error) {
    return (
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>Digest</MessageBarTitle>
          {error}
        </MessageBarBody>
      </MessageBar>
    )
  }
  if (!data) return null

  const b = data.buckets
  const totalAlertas =
    b.enRojo.length + b.renovaciones.length + b.bolsas.length + b.sinContacto.length + b.entregables.length

  const Bucket = ({
    titulo,
    icon,
    rows,
    color,
    vacio,
  }: {
    titulo: string
    icon: React.ReactNode
    rows: DigestRow[]
    color: "danger" | "warning" | "informative"
    vacio: string
  }) => (
    <Card className={styles.card}>
      <div className={styles.cardHead}>
        {icon}
        <Subtitle2>{titulo}</Subtitle2>
        <Badge className={styles.count} appearance="tint" color={rows.length ? color : "subtle"}>
          {rows.length}
        </Badge>
      </div>
      {rows.length === 0 ? (
        <Text className={styles.empty}>{vacio}</Text>
      ) : (
        rows.map((r) => (
          <div key={r.id + titulo} className={styles.row}>
            <span className={styles.chip} style={{ background: bg(r.color) }}>{r.score ?? "—"}</span>
            <Link className={styles.link} href={`/clientes/${r.id}`}>{r.name}</Link>
            {r.estrategico && <span title="Estratégico">⭐</span>}
            <span className={styles.detalle}>{r.detalle}</span>
          </div>
        ))
      )}
    </Card>
  )

  return (
    <>
      <div className={styles.bar}>
        <Text className={styles.meta}>
          {data.totalClientes} clientes · {data.sincronizados} sincronizados ·{" "}
          {totalAlertas === 0 ? "sin alertas 🎉" : `${totalAlertas} alertas`}
          {data.sinDatosSalud > 0 ? ` · ${data.sinDatosSalud} sin datos de salud` : ""} · generado{" "}
          {new Date(data.generatedAt).toLocaleString("es-CO")}
        </Text>
        <div className={styles.spacer} />
        <Button appearance="secondary" icon={<SparkleRegular />} onClick={() => { setConIntro(true); load(true) }} disabled={loading}>
          Resumen con IA
        </Button>
        <Button appearance="subtle" icon={<ArrowSyncRegular />} onClick={() => load(conIntro)} disabled={loading}>
          Recargar
        </Button>
      </div>

      {data.intro && (
        <Card className={styles.intro}>
          <SparkleRegular fontSize={22} style={{ color: tokens.colorBrandForeground1, flexShrink: 0 }} />
          <Text>{data.intro}</Text>
        </Card>
      )}

      {data.totalClientes === 0 && (
        <MessageBar intent="info" style={{ marginBottom: tokens.spacingVerticalL }}>
          <MessageBarBody>
            <MessageBarTitle>Aún no hay datos</MessageBarTitle>
            No hay clientes vinculados a GLPI todavía. A medida que se sincronicen clientes y tickets, el digest
            se irá poblando automáticamente.
          </MessageBarBody>
        </MessageBar>
      )}

      <div className={styles.grid}>
        <Bucket titulo="En riesgo (rojo)" icon={<WarningRegular />} rows={b.enRojo} color="danger" vacio="Ningún cliente en rojo." />
        <Bucket titulo="Renovaciones ≤30 días" icon={<CalendarClockRegular />} rows={b.renovaciones} color="warning" vacio="Sin renovaciones inminentes." />
        <Bucket titulo="Bolsas por agotarse (≤6 sem)" icon={<ClockRegular />} rows={b.bolsas} color="warning" vacio="Ninguna bolsa por agotarse." />
        <Bucket titulo="Sin contacto (>60 días)" icon={<PersonQuestionMarkRegular />} rows={b.sinContacto} color="informative" vacio="Todos con contacto reciente." />

        {/* Entregables (valor agregado) — forma distinta a los buckets de cliente. */}
        <Card className={styles.card}>
          <div className={styles.cardHead}>
            <CalendarClockRegular />
            <Subtitle2>Entregables por entregar</Subtitle2>
            <Badge className={styles.count} appearance="tint" color={b.entregables.length ? "danger" : "subtle"}>
              {b.entregables.length}
            </Badge>
          </div>
          {b.entregables.length === 0 ? (
            <Text className={styles.empty}>Sin entregables vencidos o próximos.</Text>
          ) : (
            b.entregables.map((e, i) => (
              <div key={e.accountId + e.nombre + i} className={styles.row}>
                <Badge appearance="tint" color={e.vencido ? "danger" : "warning"}>{e.vencido ? "vencido" : "próximo"}</Badge>
                <Link className={styles.link} href={`/clientes/${e.accountId}`}>{e.cliente}</Link>
                <span className={styles.detalle}>{e.nombre} · {e.detalle}</span>
              </div>
            ))
          )}
        </Card>
      </div>
    </>
  )
}
