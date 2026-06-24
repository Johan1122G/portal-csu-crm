"use client"

import { useCallback, useEffect, useState } from "react"
import {
  makeStyles,
  tokens,
  Button,
  Input,
  Dropdown,
  Option,
  Textarea,
  Field,
  Spinner,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableBody,
  TableCell,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components"
import { AddRegular, EditRegular, DeleteRegular } from "@fluentui/react-icons"
import { format } from "date-fns"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { CatalogDropdown } from "@/components/catalog/CatalogControls"

const useStyles = makeStyles({
  toolbar: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "center", flexWrap: "wrap", marginBottom: tokens.spacingVerticalL },
  spacer: { flexGrow: 1 },
  card: { backgroundColor: tokens.colorNeutralBackground1, borderRadius: tokens.borderRadiusMedium, border: `1px solid ${tokens.colorNeutralStroke2}`, overflow: "hidden" },
  center: { display: "flex", justifyContent: "center", padding: tokens.spacingVerticalXXXL },
  form: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM, minWidth: "min(520px, 80vw)" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: tokens.spacingHorizontalM },
})

type OppRow = {
  id: string
  name: string
  cr_bex_origen: string
  cr_bex_tipo: string | null
  cr_bex_impacto: string | null
  prioritycode: string | null
  cr_bex_responsable: string | null
  cr_bex_accionrequerida: string | null
  estimatedclosedate: string | null
  statecode: string
  account: { id: string; name: string }
  serviceCatalogItemId: string | null
  serviceCatalogItem: { nombre: string; unidad: string } | null
}

type ClienteOpt = { id: string; name: string }
type ServicioOpt = { id: string; nombre: string; unidad: string }

const emptyForm = {
  accountId: "",
  accountName: "",
  name: "",
  cr_bex_origen: "Gestión CS",
  cr_bex_tipo: "",
  cr_bex_impacto: "",
  prioritycode: "",
  cr_bex_responsable: "",
  cr_bex_accionrequerida: "",
  estimatedclosedate: "",
  statecode: "Pendiente",
  serviceCatalogItemId: "",
  serviceName: "",
}

export function OportunidadesView() {
  const styles = useStyles()
  const [rows, setRows] = useState<OppRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tipo, setTipo] = useState("")
  const [impacto, setImpacto] = useState("")
  const [prioridad, setPrioridad] = useState("")
  const [estado, setEstado] = useState("")

  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [servicios, setServicios] = useState<ServicioOpt[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (tipo) qs.set("tipo", tipo)
      if (impacto) qs.set("impacto", impacto)
      if (prioridad) qs.set("prioridad", prioridad)
      if (estado) qs.set("estado", estado)
      const res = await fetch(`/api/oportunidades?${qs.toString()}`)
      const json = await res.json()
      setRows(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [tipo, impacto, prioridad, estado])

  useEffect(() => {
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  useEffect(() => {
    fetch("/api/clientes?limit=100")
      .then((r) => r.json())
      .then((j) => setClientes((j.data ?? []).map((c: ClienteOpt) => ({ id: c.id, name: c.name }))))
      .catch(() => {})
    fetch("/api/catalogo-servicios")
      .then((r) => r.json())
      .then((j) => setServicios((j.items ?? []).map((s: ServicioOpt) => ({ id: s.id, nombre: s.nombre, unidad: s.unidad }))))
      .catch(() => {})
  }, [])

  function openDialog() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setOpen(true)
  }

  function openEdit(o: OppRow) {
    setEditingId(o.id)
    setForm({
      accountId: o.account.id,
      accountName: o.account.name,
      name: o.name,
      cr_bex_origen: o.cr_bex_origen ?? "Gestión CS",
      cr_bex_tipo: o.cr_bex_tipo ?? "",
      cr_bex_impacto: o.cr_bex_impacto ?? "",
      prioritycode: o.prioritycode ?? "",
      cr_bex_responsable: o.cr_bex_responsable ?? "",
      cr_bex_accionrequerida: o.cr_bex_accionrequerida ?? "",
      estimatedclosedate: o.estimatedclosedate ? o.estimatedclosedate.slice(0, 10) : "",
      statecode: o.statecode,
      serviceCatalogItemId: o.serviceCatalogItemId ?? "",
      serviceName: o.serviceCatalogItem ? `${o.serviceCatalogItem.nombre} · ${o.serviceCatalogItem.unidad}` : "",
    })
    setFormError(null)
    setOpen(true)
  }

  async function save() {
    if (!form.accountId || !form.name.trim()) {
      setFormError("Cliente y descripción son obligatorios.")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      // accountName/serviceName son solo para mostrar; zod descarta llaves desconocidas.
      const res = await fetch(editingId ? `/api/oportunidades/${editingId}` : "/api/oportunidades", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const j = await res.json()
        setFormError(j.error ?? "No se pudo guardar la oportunidad")
        return
      }
      setOpen(false)
      fetchData()
    } finally {
      setSaving(false)
    }
  }

  async function remove(o: OppRow) {
    if (!confirm(`¿Eliminar la oportunidad "${o.name}"?`)) return
    await fetch(`/api/oportunidades/${o.id}`, { method: "DELETE" })
    fetchData()
  }

  return (
    <>
      <div className={styles.toolbar}>
        <CatalogDropdown catalogKey="TIPOS_OPORTUNIDAD" placeholder="Tipo" value={tipo} onSelect={setTipo} clearable />
        <CatalogDropdown catalogKey="IMPACTOS" placeholder="Impacto" value={impacto} onSelect={setImpacto} clearable />
        <CatalogDropdown catalogKey="PRIORIDADES" placeholder="Prioridad" value={prioridad} onSelect={setPrioridad} clearable />
        <CatalogDropdown catalogKey="ESTADOS_OPORTUNIDAD" placeholder="Estado" value={estado} onSelect={setEstado} clearable />
        <div className={styles.spacer} />
        <Button appearance="primary" icon={<AddRegular />} onClick={openDialog}>
          Nueva oportunidad
        </Button>
      </div>

      {loading ? (
        <div className={styles.center}>
          <Spinner label="Cargando oportunidades…" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="Sin oportunidades" description="No hay oportunidades que coincidan con los filtros." />
      ) : (
        <div className={styles.card}>
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Cliente</TableHeaderCell>
                <TableHeaderCell>Descripción</TableHeaderCell>
                <TableHeaderCell>Servicio BEXT</TableHeaderCell>
                <TableHeaderCell>Tipo</TableHeaderCell>
                <TableHeaderCell>Impacto</TableHeaderCell>
                <TableHeaderCell>Prioridad</TableHeaderCell>
                <TableHeaderCell>Responsable</TableHeaderCell>
                <TableHeaderCell>Compromiso</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
                <TableHeaderCell>Acciones</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>{o.account?.name}</TableCell>
                  <TableCell>{o.name}</TableCell>
                  <TableCell>{o.serviceCatalogItem?.nombre ?? "—"}</TableCell>
                  <TableCell>{o.cr_bex_tipo ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge value={o.cr_bex_impacto} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={o.prioritycode} />
                  </TableCell>
                  <TableCell>{o.cr_bex_responsable ?? "—"}</TableCell>
                  <TableCell>{o.estimatedclosedate ? format(new Date(o.estimatedclosedate), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell>
                    <StatusBadge value={o.statecode} />
                  </TableCell>
                  <TableCell>
                    <Button appearance="subtle" size="small" icon={<EditRegular />} aria-label="Editar" onClick={() => openEdit(o)} />
                    <Button appearance="subtle" size="small" icon={<DeleteRegular />} aria-label="Eliminar" onClick={() => remove(o)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(_, d) => setOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{editingId ? "Editar oportunidad" : "Nueva oportunidad / recomendación"}</DialogTitle>
            <DialogContent>
              <div className={styles.form}>
                {formError && (
                  <MessageBar intent="error">
                    <MessageBarBody>{formError}</MessageBarBody>
                  </MessageBar>
                )}
                <Field label="Cliente" required>
                  <Dropdown
                    placeholder="Seleccionar cliente…"
                    disabled={!!editingId}
                    value={form.accountName}
                    selectedOptions={form.accountId ? [form.accountId] : []}
                    onOptionSelect={(_, d) => setForm((f) => ({ ...f, accountId: d.optionValue ?? "", accountName: d.optionText ?? "" }))}
                  >
                    {clientes.map((c) => (
                      <Option key={c.id} value={c.id}>
                        {c.name}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
                <Field label="Descripción" required>
                  <Input value={form.name} onChange={(_, d) => setForm((f) => ({ ...f, name: d.value }))} />
                </Field>
                <div className={styles.grid2}>
                  <Field label="Origen">
                    <CatalogDropdown catalogKey="ORIGENES_OPORTUNIDAD" value={form.cr_bex_origen} onSelect={(v) => setForm((f) => ({ ...f, cr_bex_origen: v || "Gestión CS" }))} />
                  </Field>
                  <Field label="Tipo">
                    <CatalogDropdown catalogKey="TIPOS_OPORTUNIDAD" placeholder="Tipo…" value={form.cr_bex_tipo} onSelect={(v) => setForm((f) => ({ ...f, cr_bex_tipo: v }))} clearable />
                  </Field>
                  <Field label="Impacto">
                    <CatalogDropdown catalogKey="IMPACTOS" placeholder="Impacto…" value={form.cr_bex_impacto} onSelect={(v) => setForm((f) => ({ ...f, cr_bex_impacto: v }))} clearable />
                  </Field>
                  <Field label="Prioridad">
                    <CatalogDropdown catalogKey="PRIORIDADES" placeholder="Prioridad…" value={form.prioritycode} onSelect={(v) => setForm((f) => ({ ...f, prioritycode: v }))} clearable />
                  </Field>
                  <Field label="Responsable">
                    <Input value={form.cr_bex_responsable} onChange={(_, d) => setForm((f) => ({ ...f, cr_bex_responsable: d.value }))} />
                  </Field>
                  <Field label="Fecha compromiso">
                    <Input type="date" value={form.estimatedclosedate} onChange={(_, d) => setForm((f) => ({ ...f, estimatedclosedate: d.value }))} />
                  </Field>
                </div>
                <Field label="Servicio BEXT (upsell)">
                  <Dropdown
                    placeholder="Asociar servicio del catálogo…"
                    value={form.serviceName}
                    selectedOptions={form.serviceCatalogItemId ? [form.serviceCatalogItemId] : []}
                    onOptionSelect={(_, d) =>
                      setForm((f) => ({ ...f, serviceCatalogItemId: d.optionValue ?? "", serviceName: d.optionText ?? "" }))
                    }
                  >
                    <Option value="" text="">
                      (ninguno)
                    </Option>
                    {servicios.map((s) => (
                      <Option key={s.id} value={s.id} text={`${s.nombre} · ${s.unidad}`}>
                        {s.nombre} · {s.unidad}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
                <Field label="Acción requerida">
                  <Textarea value={form.cr_bex_accionrequerida} onChange={(_, d) => setForm((f) => ({ ...f, cr_bex_accionrequerida: d.value }))} resize="vertical" />
                </Field>
                <Field label="Estado">
                  <CatalogDropdown catalogKey="ESTADOS_OPORTUNIDAD" value={form.statecode} onSelect={(v) => setForm((f) => ({ ...f, statecode: v || "Pendiente" }))} />
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
