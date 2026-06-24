"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  makeStyles,
  tokens,
  Button,
  Spinner,
  Checkbox,
  Badge,
  Text,
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
import { ArrowSyncRegular, ArrowLeftRegular } from "@fluentui/react-icons"
import { EmptyState } from "@/components/shared/EmptyState"

type EntityRow = {
  glpiId: string
  name: string
  registration_number: string
  accountnumber: string
  town: string
  website: string
  exists: boolean
  existingAccountId: string | null
}

type SyncResult = {
  created: number
  updated: number
  errors: { glpiId: string; name: string; error: string }[]
}

const useStyles = makeStyles({
  bar: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "center", flexWrap: "wrap", marginBottom: tokens.spacingVerticalL },
  spacer: { flexGrow: 1 },
  card: { backgroundColor: tokens.colorNeutralBackground1, borderRadius: tokens.borderRadiusMedium, border: `1px solid ${tokens.colorNeutralStroke2}`, overflow: "hidden" },
  center: { display: "flex", justifyContent: "center", padding: tokens.spacingVerticalXXXL },
  msg: { marginBottom: tokens.spacingVerticalL },
})

export function GLPISync() {
  const styles = useStyles()
  const router = useRouter()
  const [rows, setRows] = useState<EntityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/glpi/entities")
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "No se pudieron traer las entidades de GLPI")
        setRows([])
        return
      }
      setRows(json.data ?? [])
      setSelected(new Set())
    } catch {
      setError("Error de red al consultar GLPI")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.glpiId))))
  }
  function selectNuevas() {
    setSelected(new Set(rows.filter((r) => !r.exists).map((r) => r.glpiId)))
  }

  async function sync() {
    if (selected.size === 0) return
    setSyncing(true)
    setResult(null)
    try {
      const res = await fetch("/api/glpi/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ glpiIds: Array.from(selected) }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Falló la sincronización")
        return
      }
      setResult(json)
      await load()
    } finally {
      setSyncing(false)
    }
  }

  const nuevas = rows.filter((r) => !r.exists).length

  return (
    <>
      <div className={styles.bar}>
        <Button appearance="subtle" icon={<ArrowLeftRegular />} onClick={() => router.push("/clientes")}>
          Volver a clientes
        </Button>
        <div className={styles.spacer} />
        {!loading && !error && (
          <>
            <Button appearance="secondary" onClick={selectNuevas} disabled={nuevas === 0}>
              Seleccionar nuevas ({nuevas})
            </Button>
            <Button
              appearance="primary"
              icon={<ArrowSyncRegular />}
              onClick={sync}
              disabled={selected.size === 0 || syncing}
            >
              {syncing ? "Sincronizando…" : `Importar / actualizar (${selected.size})`}
            </Button>
          </>
        )}
        <Button appearance="subtle" icon={<ArrowSyncRegular />} onClick={load} disabled={loading || syncing}>
          Recargar
        </Button>
      </div>

      {error && (
        <MessageBar intent="error" className={styles.msg}>
          <MessageBarBody>
            <MessageBarTitle>GLPI</MessageBarTitle>
            {error}
          </MessageBarBody>
        </MessageBar>
      )}

      {result && (
        <MessageBar intent={result.errors.length ? "warning" : "success"} className={styles.msg}>
          <MessageBarBody>
            <MessageBarTitle>Sincronización completada</MessageBarTitle>
            {result.created} creados · {result.updated} actualizados
            {result.errors.length > 0 && ` · ${result.errors.length} con error`}
          </MessageBarBody>
        </MessageBar>
      )}

      {loading ? (
        <div className={styles.center}>
          <Spinner label="Consultando GLPI…" />
        </div>
      ) : error ? null : rows.length === 0 ? (
        <EmptyState title="Sin entidades" description="GLPI no devolvió entidades." />
      ) : (
        <div className={styles.card}>
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>
                  <Checkbox
                    checked={selected.size === rows.length ? true : selected.size === 0 ? false : "mixed"}
                    onChange={toggleAll}
                  />
                </TableHeaderCell>
                <TableHeaderCell>Razón Social (GLPI)</TableHeaderCell>
                <TableHeaderCell>NIT</TableHeaderCell>
                <TableHeaderCell>Ciudad</TableHeaderCell>
                <TableHeaderCell>Web</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.glpiId}>
                  <TableCell>
                    <Checkbox checked={selected.has(r.glpiId)} onChange={() => toggle(r.glpiId)} />
                  </TableCell>
                  <TableCell>
                    <Text weight="semibold">{r.name}</Text>
                  </TableCell>
                  <TableCell>{r.accountnumber}</TableCell>
                  <TableCell>{r.town || "—"}</TableCell>
                  <TableCell>{r.website || "—"}</TableCell>
                  <TableCell>
                    {r.exists ? (
                      <Badge appearance="tint" color="informative">
                        Ya existe
                      </Badge>
                    ) : (
                      <Badge appearance="tint" color="success">
                        Nueva
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}
