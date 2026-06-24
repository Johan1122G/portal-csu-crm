"use client"

import { useCallback, useEffect, useState } from "react"
import {
  makeStyles,
  tokens,
  Card,
  Subtitle2,
  Text,
  Button,
  Input,
  Switch,
  Spinner,
  Badge,
} from "@fluentui/react-components"
import { AddRegular, DeleteRegular, ArrowDownloadRegular } from "@fluentui/react-icons"
import { CATALOG_LABELS, SYSTEM_CATALOG_KEYS } from "@/lib/constants"
import { useCatalogRefresh } from "@/components/catalog/CatalogProvider"

type Row = { id: string; key: string; value: string; active: boolean; sortOrder: number }

const useStyles = makeStyles({
  topbar: { display: "flex", justifyContent: "flex-end", marginBottom: tokens.spacingVerticalL },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: tokens.spacingHorizontalL },
  card: { padding: tokens.spacingHorizontalL, display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS },
  head: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, flexWrap: "wrap" },
  option: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, padding: `${tokens.spacingVerticalXXS} 0` },
  optName: { flexGrow: 1 },
  inactive: { color: tokens.colorNeutralForeground4, textDecoration: "line-through" },
  addRow: { display: "flex", gap: tokens.spacingHorizontalS, marginTop: tokens.spacingVerticalS },
  center: { display: "flex", justifyContent: "center", padding: tokens.spacingVerticalXXXL },
})

export function CatalogManager() {
  const styles = useStyles()
  const refreshProvider = useCatalogRefresh()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/catalogos?admin=1")
      const json = await res.json()
      setRows(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function after() {
    await load()
    await refreshProvider()
  }

  async function add(key: string) {
    const value = (drafts[key] ?? "").trim()
    if (!value || busy) return
    setBusy(true)
    try {
      const res = await fetch("/api/catalogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      })
      if (res.ok) {
        setDrafts((d) => ({ ...d, [key]: "" }))
        await after()
      } else {
        const j = await res.json()
        alert(j.error ?? "No se pudo agregar")
      }
    } finally {
      setBusy(false)
    }
  }

  async function toggle(row: Row) {
    setBusy(true)
    try {
      await fetch(`/api/catalogos/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !row.active }),
      })
      await after()
    } finally {
      setBusy(false)
    }
  }

  async function remove(row: Row) {
    if (!confirm(`¿Eliminar "${row.value}" de la lista?`)) return
    setBusy(true)
    try {
      await fetch(`/api/catalogos/${row.id}`, { method: "DELETE" })
      await after()
    } finally {
      setBusy(false)
    }
  }

  async function seed() {
    setBusy(true)
    try {
      await fetch("/api/catalogos/seed", { method: "POST" })
      await after()
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <Spinner label="Cargando catálogos…" />
      </div>
    )
  }

  const keys = Object.keys(CATALOG_LABELS)

  return (
    <>
    <div className={styles.topbar}>
      <Button appearance="secondary" icon={<ArrowDownloadRegular />} onClick={seed} disabled={busy}>
        Sembrar valores por defecto
      </Button>
    </div>
    <div className={styles.grid}>
      {keys.map((key) => {
        const opts = rows.filter((r) => r.key === key)
        const isSystem = SYSTEM_CATALOG_KEYS.includes(key)
        return (
          <Card key={key} className={styles.card}>
            <div className={styles.head}>
              <Subtitle2>{CATALOG_LABELS[key]}</Subtitle2>
              {isSystem && (
                <Badge appearance="tint" color="warning">
                  afecta lógica
                </Badge>
              )}
            </div>
            {opts.length === 0 ? (
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                Sin valores (usa &quot;Sembrar valores por defecto&quot; arriba).
              </Text>
            ) : (
              opts.map((row) => (
                <div key={row.id} className={styles.option}>
                  <Text className={`${styles.optName} ${row.active ? "" : styles.inactive}`}>{row.value}</Text>
                  <Switch checked={row.active} onChange={() => toggle(row)} title="Activo" />
                  <Button appearance="subtle" size="small" icon={<DeleteRegular />} aria-label="Eliminar" onClick={() => remove(row)} />
                </div>
              ))
            )}
            <div className={styles.addRow}>
              <Input
                placeholder="Nuevo valor…"
                value={drafts[key] ?? ""}
                onChange={(_, d) => setDrafts((s) => ({ ...s, [key]: d.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") add(key)
                }}
                style={{ flexGrow: 1 }}
              />
              <Button appearance="primary" icon={<AddRegular />} onClick={() => add(key)} disabled={busy}>
                Agregar
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
    </>
  )
}
