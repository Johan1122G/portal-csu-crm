"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  makeStyles,
  tokens,
  Button,
  Field,
  Input,
  Dropdown,
  Option,
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
  Textarea,
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components"
import { AddRegular, EditRegular, DeleteRegular } from "@fluentui/react-icons"
import { format } from "date-fns"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { CatalogDropdown } from "@/components/catalog/CatalogControls"
import type { ProductService } from "@/types"

const useStyles = makeStyles({
  head: { display: "flex", justifyContent: "flex-end", marginBottom: tokens.spacingVerticalM },
  form: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM, minWidth: "min(480px, 80vw)" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: tokens.spacingHorizontalM },
  rowActions: { display: "flex", gap: tokens.spacingHorizontalXS },
})

type FormState = {
  cr_bex_productoservicio: string
  cr_bex_lineanegocio: string
  statecode: string
  activeon: string
  expireson: string
  cr_bex_responsablebext: string
  cr_bex_observaciones: string
}

const empty: FormState = {
  cr_bex_productoservicio: "",
  cr_bex_lineanegocio: "",
  statecode: "Activo",
  activeon: "",
  expireson: "",
  cr_bex_responsablebext: "",
  cr_bex_observaciones: "",
}

const toDateInput = (d?: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "")

type ServicioOpt = { id: string; nombre: string; unidad: string; categoria: string | null }

export function ProductosTab({
  accountId,
  accountName,
  items,
}: {
  accountId: string
  accountName: string
  items: ProductService[]
}) {
  const styles = useStyles()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [servicios, setServicios] = useState<ServicioOpt[]>([])

  useEffect(() => {
    fetch("/api/catalogo-servicios")
      .then((r) => r.json())
      .then((j) => setServicios(j.items ?? []))
      .catch(() => {})
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm(empty)
    setError(null)
    setOpen(true)
  }
  function openEdit(p: ProductService) {
    setEditingId(p.id)
    setForm({
      cr_bex_productoservicio: p.cr_bex_productoservicio,
      cr_bex_lineanegocio: p.cr_bex_lineanegocio ?? "",
      statecode: p.statecode,
      activeon: toDateInput(p.activeon),
      expireson: toDateInput(p.expireson),
      cr_bex_responsablebext: p.cr_bex_responsablebext ?? "",
      cr_bex_observaciones: p.cr_bex_observaciones ?? "",
    })
    setError(null)
    setOpen(true)
  }

  async function save() {
    if (!form.cr_bex_productoservicio.trim()) {
      setError("El producto/servicio es obligatorio.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const url = editingId ? `/api/productos/${editingId}` : "/api/productos"
      const method = editingId ? "PUT" : "POST"
      // title = Razón Social (denormalizado para el export D365).
      const body = editingId ? form : { ...form, accountId, title: accountName }
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

  async function remove(p: ProductService) {
    if (!confirm(`¿Eliminar "${p.cr_bex_productoservicio}"?`)) return
    await fetch(`/api/productos/${p.id}`, { method: "DELETE" })
    router.refresh()
  }

  return (
    <>
      <div className={styles.head}>
        <Button appearance="primary" icon={<AddRegular />} onClick={openCreate}>
          Agregar producto
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Sin productos / servicios" description="Agrega el primer producto contratado." />
      ) : (
        <Table size="small">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Producto / Servicio</TableHeaderCell>
              <TableHeaderCell>Línea</TableHeaderCell>
              <TableHeaderCell>Estado</TableHeaderCell>
              <TableHeaderCell>Inicio</TableHeaderCell>
              <TableHeaderCell>Renovación</TableHeaderCell>
              <TableHeaderCell>Responsable</TableHeaderCell>
              <TableHeaderCell>Acciones</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.cr_bex_productoservicio}</TableCell>
                <TableCell>{p.cr_bex_lineanegocio ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge value={p.statecode} />
                </TableCell>
                <TableCell>{p.activeon ? format(new Date(p.activeon), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell>{p.expireson ? format(new Date(p.expireson), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell>{p.cr_bex_responsablebext ?? "—"}</TableCell>
                <TableCell>
                  <div className={styles.rowActions}>
                    <Button appearance="subtle" size="small" icon={<EditRegular />} aria-label="Editar" onClick={() => openEdit(p)} />
                    <Button appearance="subtle" size="small" icon={<DeleteRegular />} aria-label="Eliminar" onClick={() => remove(p)} />
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
            <DialogTitle>{editingId ? "Editar producto / servicio" : "Nuevo producto / servicio"}</DialogTitle>
            <DialogContent>
              <div className={styles.form}>
                {error && (
                  <MessageBar intent="error">
                    <MessageBarBody>{error}</MessageBarBody>
                  </MessageBar>
                )}
                <Field label="Seleccionar del catálogo BEXT (opcional)" hint="Elige una oferta del portafolio; rellena el nombre abajo. Puedes ajustarlo.">
                  <Dropdown
                    placeholder="Buscar en el portafolio BEXT…"
                    value={servicios.some((s) => s.nombre === form.cr_bex_productoservicio) ? form.cr_bex_productoservicio : ""}
                    selectedOptions={
                      servicios.filter((s) => s.nombre === form.cr_bex_productoservicio).map((s) => s.id)
                    }
                    onOptionSelect={(_, d) => {
                      const s = servicios.find((x) => x.id === d.optionValue)
                      if (s) setForm((f) => ({ ...f, cr_bex_productoservicio: s.nombre }))
                    }}
                  >
                    {servicios.map((s) => (
                      <Option key={s.id} value={s.id} text={`${s.nombre} · ${s.unidad}`}>
                        {s.nombre} · {s.unidad}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
                <Field label="Producto / Servicio" required>
                  <Input value={form.cr_bex_productoservicio} onChange={(_, d) => setForm((f) => ({ ...f, cr_bex_productoservicio: d.value }))} />
                </Field>
                <div className={styles.grid2}>
                  <Field label="Línea de negocio">
                    <CatalogDropdown
                      catalogKey="LINEAS_NEGOCIO"
                      placeholder="Línea…"
                      value={form.cr_bex_lineanegocio}
                      onSelect={(v) => setForm((f) => ({ ...f, cr_bex_lineanegocio: v }))}
                      clearable
                    />
                  </Field>
                  <Field label="Estado">
                    <CatalogDropdown
                      catalogKey="ESTADOS_SERVICIO"
                      value={form.statecode}
                      onSelect={(v) => setForm((f) => ({ ...f, statecode: v || "Activo" }))}
                    />
                  </Field>
                  <Field label="Fecha inicio">
                    <Input type="date" value={form.activeon} onChange={(_, d) => setForm((f) => ({ ...f, activeon: d.value }))} />
                  </Field>
                  <Field label="Fecha renovación">
                    <Input type="date" value={form.expireson} onChange={(_, d) => setForm((f) => ({ ...f, expireson: d.value }))} />
                  </Field>
                </div>
                <Field label="Responsable BEXT">
                  <Input value={form.cr_bex_responsablebext} onChange={(_, d) => setForm((f) => ({ ...f, cr_bex_responsablebext: d.value }))} />
                </Field>
                <Field label="Observaciones">
                  <Textarea value={form.cr_bex_observaciones} onChange={(_, d) => setForm((f) => ({ ...f, cr_bex_observaciones: d.value }))} resize="vertical" />
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
