"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  makeStyles,
  tokens,
  Button,
  Field,
  Input,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableBody,
  TableCell,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components"
import { AddRegular, EditRegular, DeleteRegular } from "@fluentui/react-icons"
import { EmptyState } from "@/components/shared/EmptyState"
import { CatalogDropdown } from "@/components/catalog/CatalogControls"
import type { Contact } from "@/types"

const useStyles = makeStyles({
  head: { display: "flex", justifyContent: "flex-end", marginBottom: tokens.spacingVerticalM },
  form: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM, minWidth: "min(480px, 80vw)" },
  rowActions: { display: "flex", gap: tokens.spacingHorizontalXS },
})

type FormState = {
  cr_bex_tipocontacto: string
  fullname: string
  jobtitle: string
  telephone1: string
  emailaddress1: string
}

const empty: FormState = { cr_bex_tipocontacto: "Principal", fullname: "", jobtitle: "", telephone1: "", emailaddress1: "" }

export function ContactosTab({ accountId, items }: { accountId: string; items: Contact[] }) {
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
  function openEdit(c: Contact) {
    setEditingId(c.id)
    setForm({
      cr_bex_tipocontacto: c.cr_bex_tipocontacto,
      fullname: c.fullname,
      jobtitle: c.jobtitle ?? "",
      telephone1: c.telephone1 ?? "",
      emailaddress1: c.emailaddress1,
    })
    setError(null)
    setOpen(true)
  }

  async function save() {
    if (!form.fullname.trim() || !form.emailaddress1.trim()) {
      setError("Nombre y correo son obligatorios.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const url = editingId ? `/api/contactos/${editingId}` : "/api/contactos"
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

  async function remove(c: Contact) {
    if (!confirm(`¿Eliminar el contacto "${c.fullname}"?`)) return
    await fetch(`/api/contactos/${c.id}`, { method: "DELETE" })
    router.refresh()
  }

  return (
    <>
      <div className={styles.head}>
        <Button appearance="primary" icon={<AddRegular />} onClick={openCreate}>
          Agregar contacto
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Sin contactos" description="Agrega el primer contacto del cliente." />
      ) : (
        <Table size="small">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Tipo</TableHeaderCell>
              <TableHeaderCell>Nombre</TableHeaderCell>
              <TableHeaderCell>Cargo</TableHeaderCell>
              <TableHeaderCell>Teléfono</TableHeaderCell>
              <TableHeaderCell>Correo</TableHeaderCell>
              <TableHeaderCell>Acciones</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.cr_bex_tipocontacto}</TableCell>
                <TableCell>{c.fullname}</TableCell>
                <TableCell>{c.jobtitle ?? "—"}</TableCell>
                <TableCell>{c.telephone1 ?? "—"}</TableCell>
                <TableCell>{c.emailaddress1}</TableCell>
                <TableCell>
                  <div className={styles.rowActions}>
                    <Button appearance="subtle" size="small" icon={<EditRegular />} aria-label="Editar" onClick={() => openEdit(c)} />
                    <Button appearance="subtle" size="small" icon={<DeleteRegular />} aria-label="Eliminar" onClick={() => remove(c)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={(_, d) => setOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{editingId ? "Editar contacto" : "Nuevo contacto"}</DialogTitle>
            <DialogContent>
              <div className={styles.form}>
                {error && (
                  <MessageBar intent="error">
                    <MessageBarBody>{error}</MessageBarBody>
                  </MessageBar>
                )}
                <Field label="Tipo de contacto" required>
                  <CatalogDropdown
                    catalogKey="TIPOS_CONTACTO"
                    value={form.cr_bex_tipocontacto}
                    onSelect={(v) => setForm((f) => ({ ...f, cr_bex_tipocontacto: v }))}
                  />
                </Field>
                <Field label="Nombre completo" required>
                  <Input value={form.fullname} onChange={(_, d) => setForm((f) => ({ ...f, fullname: d.value }))} />
                </Field>
                <Field label="Cargo">
                  <Input value={form.jobtitle} onChange={(_, d) => setForm((f) => ({ ...f, jobtitle: d.value }))} />
                </Field>
                <Field label="Teléfono">
                  <Input value={form.telephone1} onChange={(_, d) => setForm((f) => ({ ...f, telephone1: d.value }))} />
                </Field>
                <Field label="Correo" required>
                  <Input type="email" value={form.emailaddress1} onChange={(_, d) => setForm((f) => ({ ...f, emailaddress1: d.value }))} />
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
