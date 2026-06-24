"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  makeStyles,
  tokens,
  Button,
  Field,
  Input,
  Card,
  Text,
  Badge,
  Subtitle2,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Textarea,
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components"
import { AddRegular, EditRegular, DeleteRegular } from "@fluentui/react-icons"
import { format } from "date-fns"
import { EmptyState } from "@/components/shared/EmptyState"
import { CatalogDropdown } from "@/components/catalog/CatalogControls"
import type { BextRelationship } from "@/types"

const useStyles = makeStyles({
  head: { display: "flex", justifyContent: "flex-end", marginBottom: tokens.spacingVerticalM },
  cards: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: tokens.spacingHorizontalL },
  card: { padding: tokens.spacingHorizontalL, display: "flex", flexDirection: "column", gap: tokens.spacingVerticalXS },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: tokens.spacingHorizontalS },
  cardActions: { display: "flex", gap: tokens.spacingHorizontalXS },
  field: { display: "flex", flexDirection: "column", gap: "2px" },
  label: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  form: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM, minWidth: "min(480px, 80vw)" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: tokens.spacingHorizontalM },
})

type FormState = {
  cr_bex_rolbext: string
  cr_bex_nombrepersona: string
  cr_bex_frecuenciacontacto: string
  cr_bex_nivelrelacionamiento: string
  cr_bex_ultimareunion: string
  cr_bex_proximareunion: string
  cr_bex_motivoultimocontacto: string
}

const empty: FormState = {
  cr_bex_rolbext: "Ejecutivo Comercial",
  cr_bex_nombrepersona: "",
  cr_bex_frecuenciacontacto: "",
  cr_bex_nivelrelacionamiento: "",
  cr_bex_ultimareunion: "",
  cr_bex_proximareunion: "",
  cr_bex_motivoultimocontacto: "",
}

const toDateInput = (d?: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "")
const fmt = (d?: Date | string | null) => (d ? format(new Date(d), "dd/MM/yyyy") : "—")

export function RelacionamientoTab({ accountId, items }: { accountId: string; items: BextRelationship[] }) {
  const styles = useStyles()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditingId(null)
    setForm(empty)
    setError(null)
    setOpen(true)
  }
  function openEdit(r: BextRelationship) {
    setEditingId(r.id)
    setForm({
      cr_bex_rolbext: r.cr_bex_rolbext,
      cr_bex_nombrepersona: r.cr_bex_nombrepersona,
      cr_bex_frecuenciacontacto: r.cr_bex_frecuenciacontacto ?? "",
      cr_bex_nivelrelacionamiento: r.cr_bex_nivelrelacionamiento ?? "",
      cr_bex_ultimareunion: toDateInput(r.cr_bex_ultimareunion),
      cr_bex_proximareunion: toDateInput(r.cr_bex_proximareunion),
      cr_bex_motivoultimocontacto: r.cr_bex_motivoultimocontacto ?? "",
    })
    setError(null)
    setOpen(true)
  }

  async function save() {
    if (!form.cr_bex_nombrepersona.trim()) {
      setError("El nombre es obligatorio.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const url = editingId ? `/api/relacionamiento/${editingId}` : "/api/relacionamiento"
      const method = editingId ? "PUT" : "POST"
      const body = editingId ? form : { ...form, accountId }
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? "No se pudo guardar")
        return
      }
      setOpen(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function remove(r: BextRelationship) {
    if (!confirm(`¿Eliminar a "${r.cr_bex_nombrepersona}" del relacionamiento?`)) return
    await fetch(`/api/relacionamiento/${r.id}`, { method: "DELETE" })
    router.refresh()
  }

  return (
    <>
      <div className={styles.head}>
        <Button appearance="primary" icon={<AddRegular />} onClick={openCreate}>
          Agregar persona BEXT
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Sin relacionamiento registrado" description="Agrega las personas de BEXT que atienden al cliente." />
      ) : (
        <div className={styles.cards}>
          {items.map((r) => (
            <Card key={r.id} className={styles.card}>
              <div className={styles.cardHead}>
                <Subtitle2>{r.cr_bex_nombrepersona}</Subtitle2>
                <div className={styles.cardActions}>
                  <Button appearance="subtle" size="small" icon={<EditRegular />} aria-label="Editar" onClick={() => openEdit(r)} />
                  <Button appearance="subtle" size="small" icon={<DeleteRegular />} aria-label="Eliminar" onClick={() => remove(r)} />
                </div>
              </div>
              <Badge appearance="tint" color="brand">
                {r.cr_bex_rolbext}
              </Badge>
              <div className={styles.field}>
                <span className={styles.label}>Frecuencia</span>
                <Text>{r.cr_bex_frecuenciacontacto ?? "—"}</Text>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Nivel</span>
                <Text>{r.cr_bex_nivelrelacionamiento ?? "—"}</Text>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Última reunión</span>
                <Text>{fmt(r.cr_bex_ultimareunion)}</Text>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Próxima reunión</span>
                <Text>{fmt(r.cr_bex_proximareunion)}</Text>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(_, d) => setOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{editingId ? "Editar persona BEXT" : "Nueva persona BEXT"}</DialogTitle>
            <DialogContent>
              <div className={styles.form}>
                {error && (
                  <MessageBar intent="error">
                    <MessageBarBody>{error}</MessageBarBody>
                  </MessageBar>
                )}
                <div className={styles.grid2}>
                  <Field label="Rol" required>
                    <CatalogDropdown
                      catalogKey="ROLES_BEXT"
                      value={form.cr_bex_rolbext}
                      onSelect={(v) => setForm((f) => ({ ...f, cr_bex_rolbext: v }))}
                    />
                  </Field>
                  <Field label="Nombre" required>
                    <Input value={form.cr_bex_nombrepersona} onChange={(_, d) => setForm((f) => ({ ...f, cr_bex_nombrepersona: d.value }))} />
                  </Field>
                  <Field label="Frecuencia">
                    <CatalogDropdown
                      catalogKey="FRECUENCIAS_CONTACTO"
                      placeholder="Frecuencia…"
                      value={form.cr_bex_frecuenciacontacto}
                      onSelect={(v) => setForm((f) => ({ ...f, cr_bex_frecuenciacontacto: v }))}
                      clearable
                    />
                  </Field>
                  <Field label="Nivel">
                    <CatalogDropdown
                      catalogKey="NIVELES_RELACIONAMIENTO"
                      placeholder="Nivel…"
                      value={form.cr_bex_nivelrelacionamiento}
                      onSelect={(v) => setForm((f) => ({ ...f, cr_bex_nivelrelacionamiento: v }))}
                      clearable
                    />
                  </Field>
                  <Field label="Última reunión">
                    <Input type="date" value={form.cr_bex_ultimareunion} onChange={(_, d) => setForm((f) => ({ ...f, cr_bex_ultimareunion: d.value }))} />
                  </Field>
                  <Field label="Próxima reunión">
                    <Input type="date" value={form.cr_bex_proximareunion} onChange={(_, d) => setForm((f) => ({ ...f, cr_bex_proximareunion: d.value }))} />
                  </Field>
                </div>
                <Field label="Motivo último contacto">
                  <Textarea value={form.cr_bex_motivoultimocontacto} onChange={(_, d) => setForm((f) => ({ ...f, cr_bex_motivoultimocontacto: d.value }))} resize="vertical" />
                </Field>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button appearance="primary" onClick={save} disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  )
}
