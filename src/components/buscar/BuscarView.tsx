"use client"

import { useState } from "react"
import Link from "next/link"
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
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from "@fluentui/react-components"
import { SearchRegular, SparkleRegular, DatabaseArrowUpRegular } from "@fluentui/react-icons"

type Hit = {
  accountId: string
  cliente: string
  glpiTicketId: number
  subject: string | null
  snippet: string | null
  category: string | null
  openedAt: string | null
  score: number
}

const useStyles = makeStyles({
  bar: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "center", marginBottom: tokens.spacingVerticalM, flexWrap: "wrap" },
  search: { flexGrow: 1, minWidth: "280px" },
  spacer: { flexGrow: 1 },
  center: { display: "flex", justifyContent: "center", padding: tokens.spacingVerticalXXL },
  presets: { display: "flex", gap: tokens.spacingHorizontalS, flexWrap: "wrap", marginBottom: tokens.spacingVerticalL },
  hit: { padding: tokens.spacingHorizontalL, display: "flex", flexDirection: "column", gap: "4px", borderLeft: `3px solid ${tokens.colorBrandStroke1}`, marginBottom: tokens.spacingVerticalS },
  hitHead: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, flexWrap: "wrap" },
  meta: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200, display: "flex", gap: tokens.spacingHorizontalM, flexWrap: "wrap" },
  snippet: { color: tokens.colorNeutralForeground2, fontSize: tokens.fontSizeBase200 },
  link: { color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightSemibold, textDecoration: "none" },
  msg: { marginBottom: tokens.spacingVerticalL },
})

const PRESETS = [
  "problemas de MFA o identidad",
  "lentitud o rendimiento",
  "errores de correo / Exchange",
  "seguridad y accesos",
  "respaldos y recuperación",
]

export function BuscarView() {
  const styles = useStyles()
  const [q, setQ] = useState("")
  const [hits, setHits] = useState<Hit[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [unconfigured, setUnconfigured] = useState(false)

  async function buscar(texto: string) {
    const query = texto.trim()
    if (query.length < 2 || loading) return
    setLoading(true)
    setNote(null)
    setHits(null)
    try {
      const res = await fetch("/api/analitica/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      })
      const json = await res.json()
      if (json.configured === false) {
        setUnconfigured(true)
        return
      }
      if (!res.ok) {
        setNote(json.error ?? "No se pudo buscar")
        return
      }
      setHits(json.hits ?? [])
    } catch {
      setNote("Error de red")
    } finally {
      setLoading(false)
    }
  }

  async function indexar() {
    setIndexing(true)
    setNote(null)
    try {
      const res = await fetch("/api/analitica/embeddings/index", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      const json = await res.json()
      if (json.configured === false) {
        setUnconfigured(true)
        return
      }
      setNote(`Indexación lista: ${json.indexados ?? 0} tickets embebidos${json.clientes != null ? ` en ${json.clientes} clientes` : ""}.`)
    } catch {
      setNote("Error de red al indexar")
    } finally {
      setIndexing(false)
    }
  }

  if (unconfigured) {
    return (
      <MessageBar intent="info">
        <MessageBarBody>
          <MessageBarTitle>Búsqueda semántica pendiente de configurar</MessageBarTitle>
          Crea un deployment de embeddings en tu Azure OpenAI (ej. <code>text-embedding-3-small</code>) y define{" "}
          <code>AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT</code>. Luego pulsa “Indexar tickets” y podrás buscar por significado.
        </MessageBarBody>
      </MessageBar>
    )
  }

  return (
    <>
      <div className={styles.bar}>
        <Input
          className={styles.search}
          placeholder="Busca por significado… ej: clientes con problemas de identidad/MFA"
          value={q}
          onChange={(_, d) => setQ(d.value)}
          onKeyDown={(e) => e.key === "Enter" && buscar(q)}
          contentBefore={<SearchRegular />}
        />
        <Button appearance="primary" icon={<SparkleRegular />} onClick={() => buscar(q)} disabled={loading || q.trim().length < 2}>
          {loading ? "Buscando…" : "Buscar"}
        </Button>
        <Button appearance="secondary" icon={<DatabaseArrowUpRegular />} onClick={indexar} disabled={indexing}>
          {indexing ? "Indexando…" : "Indexar tickets"}
        </Button>
      </div>

      <div className={styles.presets}>
        {PRESETS.map((p) => (
          <Button key={p} appearance="subtle" size="small" disabled={loading} onClick={() => { setQ(p); buscar(p) }}>
            {p}
          </Button>
        ))}
      </div>

      {note && (
        <MessageBar intent="info" className={styles.msg}>
          <MessageBarBody>{note}</MessageBarBody>
        </MessageBar>
      )}

      {loading && (
        <div className={styles.center}>
          <Spinner label="Buscando por significado…" />
        </div>
      )}

      {hits && hits.length === 0 && !loading && (
        <MessageBar intent="info">
          <MessageBarBody>
            Sin resultados. Si aún no has indexado, pulsa <b>“Indexar tickets”</b> primero.
          </MessageBarBody>
        </MessageBar>
      )}

      {hits && hits.length > 0 && (
        <>
          <Subtitle2 style={{ marginBottom: tokens.spacingVerticalS }}>{hits.length} resultados</Subtitle2>
          {hits.map((h) => (
            <Card key={`${h.accountId}:${h.glpiTicketId}`} className={styles.hit}>
              <div className={styles.hitHead}>
                <Badge appearance="tint" color="brand">{Math.round(h.score * 100)}%</Badge>
                <Text weight="semibold">{h.subject || `Ticket #${h.glpiTicketId}`}</Text>
              </div>
              <div className={styles.meta}>
                <Link className={styles.link} href={`/clientes/${h.accountId}`}>{h.cliente}</Link>
                {h.category && <span>· {h.category}</span>}
                {h.openedAt && <span>· {h.openedAt}</span>}
                <span>· #{h.glpiTicketId}</span>
              </div>
              {h.snippet && <Body1 className={styles.snippet}>{h.snippet}</Body1>}
            </Card>
          ))}
        </>
      )}
    </>
  )
}
