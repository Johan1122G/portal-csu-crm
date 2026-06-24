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
import { AddRegular, SearchRegular } from "@fluentui/react-icons"
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

type ActivityRow = {
  id: string
  scheduledstart: string
  cr_bex_tipogestion: string
  subject: string | null
  cr_bex_canal: string | null
  cr_bex_responsablecs: string | null
  cr_bex_areaescalar: string | null
  statecode: string
  account: { id: string; name: string }
}

type ClienteOpt = { id: string; name: string }

const emptyForm = {
  accountId: "",
  accountName: "",
  scheduledstart: "",
  cr_bex_tipogestion: "",
  cr_bex_responsablecs: "",
  cr_bex_contactocliente: "",
  cr_bex_canal: "",
  subject: "",
  description: "",
  cr_bex_areaescalar: "",
  statecode: "Completada",
}

export function ActividadesView() {
  const styles = useStyles()
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [tipo, setTipo] = useState("")
  const [area, setArea] = useState("")

  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (search) qs.set("search", search)
      if (tipo) qs.set("tipo", tipo)
      if (area) qs.set("area", area)
      const res = await fetch(`/api/actividades?${qs.toString()}`)
      const json = await res.json()
      setRows(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [search, tipo, area])

  useEffect(() => {
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  // Carga la lista de clientes para el selector del diálogo.
  useEffect(() => {
    fetch("/api/clientes?limit=100")
      .then((r) => r.json())
      .then((j) => setClientes((j.data ?? []).map((c: ClienteOpt) => ({ id: c.id, name: c.name }))))
      .catch(() => {})
  }, [])

  function openDialog() {
    setForm(emptyForm)
    setFormError(null)
    setOpen(true)
  }

  async function save() {
    if (!form.accountId || !form.scheduledstart || !form.cr_bex_tipogestion) {
      setFormError("Cliente, fecha y tipo de gestión son obligatorios.")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      // accountName es solo para mostrar; zod descarta llaves desconocidas.
      const res = await fetch("/api/actividades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const j = await res.json()
        setFormError(j.error ?? "No se pudo registrar la gestión")
        return
      }
      setOpen(false)
      fetchData()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className={styles.toolbar}>
        <Input
          placeholder="Buscar por tema…"
          value={search}
          onChange={(_, d) => setSearch(d.value)}
          contentBefore={<SearchRegular />}
          style={{ minWidth: 220 }}
        />
        <CatalogDropdown catalogKey="TIPOS_GESTION" placeholder="Tipo" value={tipo} onSelect={setTipo} clearable />
        <CatalogDropdown catalogKey="AREAS_ESCALAR" placeholder="Área a escalar" value={area} onSelect={setArea} clearable />
        <div className={styles.spacer} />
        <Button appearance="primary" icon={<AddRegular />} onClick={openDialog}>
          Registrar gestión
        </Button>
      </div>

      {loading ? (
        <div className={styles.center}>
          <Spinner label="Cargando gestiones…" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="Sin gestiones CS" description="No hay gestiones que coincidan con los filtros." />
      ) : (
        <div className={styles.card}>
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Cliente</TableHeaderCell>
                <TableHeaderCell>Fecha</TableHeaderCell>
                <TableHeaderCell>Tipo</TableHeaderCell>
                <TableHeaderCell>Tema</TableHeaderCell>
                <TableHeaderCell>Canal</TableHeaderCell>
                <TableHeaderCell>Responsable</TableHeaderCell>
                <TableHeaderCell>Área</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.account?.name}</TableCell>
                  <TableCell>{format(new Date(a.scheduledstart), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell>{a.cr_bex_tipogestion}</TableCell>
                  <TableCell>{a.subject ?? "—"}</TableCell>
                  <TableCell>{a.cr_bex_canal ?? "—"}</TableCell>
                  <TableCell>{a.cr_bex_responsablecs ?? "—"}</TableCell>
                  <TableCell>{a.cr_bex_areaescalar ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge value={a.statecode} />
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
            <DialogTitle>Registrar gestión CS</DialogTitle>
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
                <div className={styles.grid2}>
                  <Field label="Fecha de gestión" required>
                    <Input type="datetime-local" value={form.scheduledstart} onChange={(_, d) => setForm((f) => ({ ...f, scheduledstart: d.value }))} />
                  </Field>
                  <Field label="Tipo de gestión" required>
                    <CatalogDropdown catalogKey="TIPOS_GESTION" placeholder="Tipo…" value={form.cr_bex_tipogestion} onSelect={(v) => setForm((f) => ({ ...f, cr_bex_tipogestion: v }))} />
                  </Field>
                  <Field label="Canal">
                    <CatalogDropdown catalogKey="CANALES" placeholder="Canal…" value={form.cr_bex_canal} onSelect={(v) => setForm((f) => ({ ...f, cr_bex_canal: v }))} clearable />
                  </Field>
                  <Field label="Responsable CS">
                    <Input value={form.cr_bex_responsablecs} onChange={(_, d) => setForm((f) => ({ ...f, cr_bex_responsablecs: d.value }))} />
                  </Field>
                  <Field label="Contacto cliente">
                    <Input value={form.cr_bex_contactocliente} onChange={(_, d) => setForm((f) => ({ ...f, cr_bex_contactocliente: d.value }))} />
                  </Field>
                  <Field label="Área a escalar">
                    <CatalogDropdown catalogKey="AREAS_ESCALAR" placeholder="Área…" value={form.cr_bex_areaescalar} onSelect={(v) => setForm((f) => ({ ...f, cr_bex_areaescalar: v }))} clearable />
                  </Field>
                </div>
                <Field label="Tema / Motivo">
                  <Input value={form.subject} onChange={(_, d) => setForm((f) => ({ ...f, subject: d.value }))} />
                </Field>
                <Field label="Hallazgo / Voz del cliente">
                  <Textarea value={form.description} onChange={(_, d) => setForm((f) => ({ ...f, description: d.value }))} resize="vertical" />
                </Field>
                <Field label="Estado">
                  <CatalogDropdown catalogKey="ESTADOS_OPORTUNIDAD" value={form.statecode} onSelect={(v) => setForm((f) => ({ ...f, statecode: v || "Completada" }))} />
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
