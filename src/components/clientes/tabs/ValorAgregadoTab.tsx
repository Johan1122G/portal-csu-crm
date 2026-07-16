"use client"

import { useCallback, useEffect, useState } from "react"
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
  Field,
  Input,
  Dropdown,
  Option,
  Combobox,
  Divider,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
} from "@fluentui/react-components"
import { AddRegular, DeleteRegular, CheckmarkCircleRegular } from "@fluentui/react-icons"
import { useCatalog } from "@/components/catalog/CatalogProvider"
import { TIPOS_ENTREGABLE, FRECUENCIAS_ENTREGABLE } from "@/lib/constants"
import { estadoEntrega, type EstadoEntrega } from "@/lib/deliverables/cadence"
import { EmptyState } from "@/components/shared/EmptyState"

type Log = { id: string; entregadoOn: string; periodo: string | null; entregadoPor: string | null; nota: string | null }
type Deliverable = {
  id: string
  nombre: string
  categoria: string | null
  frecuencia: string
  responsable: string | null
  proximaEntrega: string | null
  ultimaEntrega: string | null
  notificarDiasAntes: number
  activo: boolean
  notas: string | null
  logs: Log[]
}

const useStyles = makeStyles({
  wrap: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalL },
  card: { padding: tokens.spacingHorizontalL, display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM },
  form: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "flex-end", flexWrap: "wrap" },
  center: { display: "flex", justifyContent: "center", padding: tokens.spacingVerticalXXL },
  row: { display: "flex", alignItems: "flex-start", gap: tokens.spacingHorizontalM, padding: `${tokens.spacingVerticalS} 0`, borderBottom: `1px solid ${tokens.colorNeutralStroke3}` },
  rowBody: { flexGrow: 1, display: "flex", flexDirection: "column", gap: "2px" },
  meta: { display: "flex", gap: tokens.spacingHorizontalS, alignItems: "center", flexWrap: "wrap", color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  actions: { display: "flex", gap: tokens.spacingHorizontalXS, alignItems: "center", flexWrap: "wrap" },
  histItem: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2, padding: "2px 0" },
})

const estadoBadge = (e: EstadoEntrega): { color: "danger" | "warning" | "success" | "subtle" | "informative"; label: string } => {
  switch (e) {
    case "vencido": return { color: "danger", label: "Vencido" }
    case "proximo": return { color: "warning", label: "Próximo" }
    case "alDia": return { color: "success", label: "Al día" }
    case "inactivo": return { color: "subtle", label: "Inactivo" }
    default: return { color: "informative", label: "Sin fecha" }
  }
}

export function ValorAgregadoTab({ accountId }: { accountId: string }) {
  const styles = useStyles()
  const [items, setItems] = useState<Deliverable[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const catTipos = useCatalog("TIPOS_ENTREGABLE")
  const catFrec = useCatalog("FRECUENCIAS_ENTREGABLE")
  const tipos = catTipos.length ? catTipos : [...TIPOS_ENTREGABLE]
  const frecuencias = catFrec.length ? catFrec : [...FRECUENCIAS_ENTREGABLE]

  const [nombre, setNombre] = useState("")
  const [frecuencia, setFrecuencia] = useState("Mensual")
  const [responsable, setResponsable] = useState("")
  const [proxima, setProxima] = useState("")
  const [diasAntes, setDiasAntes] = useState("5")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const json = await fetch(`/api/clientes/${accountId}/entregables`).then((r) => r.json())
      setItems(json.deliverables ?? [])
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    load()
  }, [load])

  async function crear() {
    if (!nombre.trim() || !frecuencia) return
    setSaving(true)
    try {
      await fetch(`/api/clientes/${accountId}/entregables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          frecuencia,
          responsable: responsable || null,
          proximaEntrega: proxima || null,
          notificarDiasAntes: Number(diasAntes) || 5,
        }),
      })
      setNombre("")
      setResponsable("")
      setProxima("")
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function entregar(id: string) {
    await fetch(`/api/entregables/${id}/entregar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
    load()
  }
  async function borrar(id: string) {
    await fetch(`/api/entregables/${id}`, { method: "DELETE" })
    load()
  }
  async function cambiarProxima(id: string, fecha: string) {
    setItems((its) => its?.map((x) => (x.id === id ? { ...x, proximaEntrega: fecha } : x)) ?? its)
    await fetch(`/api/entregables/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proximaEntrega: fecha || null }) })
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <Spinner label="Cargando entregables…" />
      </div>
    )
  }

  const now = new Date()

  return (
    <div className={styles.wrap}>
      <Card className={styles.card}>
        <Subtitle2>Nuevo entregable</Subtitle2>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          Define la actividad de valor agregado, su frecuencia y la próxima entrega. El portal avisará antes del vencimiento.
        </Text>
        <div className={styles.form}>
          <Field label="Entregable" style={{ minWidth: "260px" }}>
            <Combobox
              freeform
              placeholder="Ej: Informe de gestión de mesa"
              value={nombre}
              onOptionSelect={(_, d) => setNombre(d.optionText ?? "")}
              onChange={(e) => setNombre((e.target as HTMLInputElement).value)}
            >
              {tipos.map((t) => (
                <Option key={t}>{t}</Option>
              ))}
            </Combobox>
          </Field>
          <Field label="Frecuencia">
            <Dropdown value={frecuencia} selectedOptions={[frecuencia]} onOptionSelect={(_, d) => d.optionValue && setFrecuencia(d.optionValue)}>
              {frecuencias.map((f) => (
                <Option key={f} value={f}>{f}</Option>
              ))}
            </Dropdown>
          </Field>
          <Field label="Responsable (CSM)">
            <Input value={responsable} onChange={(_, d) => setResponsable(d.value)} placeholder="Nombre / correo" />
          </Field>
          <Field label="Próxima entrega">
            <Input type="date" value={proxima} onChange={(_, d) => setProxima(d.value)} />
          </Field>
          <Field label="Avisar (días antes)">
            <Input type="number" value={diasAntes} onChange={(_, d) => setDiasAntes(d.value)} style={{ width: "90px" }} />
          </Field>
          <Button appearance="primary" icon={<AddRegular />} onClick={crear} disabled={!nombre.trim() || saving}>
            Agregar
          </Button>
        </div>
      </Card>

      <Card className={styles.card}>
        <Subtitle2>Entregables del cliente</Subtitle2>
        {(items?.length ?? 0) === 0 ? (
          <EmptyState title="Sin entregables" description="Agrega el primero arriba, o cárgalos por el import masivo (hoja 'Entregables')." />
        ) : (
          <div>
            {items!.map((d) => {
              const prox = d.proximaEntrega ? new Date(`${d.proximaEntrega}T12:00:00`) : null
              const est = estadoEntrega({ activo: d.activo, proximaEntrega: prox, notificarDiasAntes: d.notificarDiasAntes, ahora: now })
              const badge = estadoBadge(est)
              return (
                <div key={d.id} className={styles.row}>
                  <div className={styles.rowBody}>
                    <div className={styles.meta}>
                      <Badge appearance="tint" color={badge.color}>{badge.label}</Badge>
                      <Text weight="semibold" style={{ color: tokens.colorNeutralForeground1 }}>{d.nombre}</Text>
                      <Badge appearance="outline">{d.frecuencia}</Badge>
                    </div>
                    <div className={styles.meta}>
                      {d.responsable && <span>👤 {d.responsable}</span>}
                      {d.ultimaEntrega && <span>última: {d.ultimaEntrega}</span>}
                      <span>avisar {d.notificarDiasAntes}d antes</span>
                    </div>
                    {d.logs.length > 0 && (
                      <Accordion collapsible>
                        <AccordionItem value="h">
                          <AccordionHeader size="small">Historial ({d.logs.length})</AccordionHeader>
                          <AccordionPanel>
                            {d.logs.map((l) => (
                              <div key={l.id} className={styles.histItem}>
                                ✓ {new Date(l.entregadoOn).toLocaleDateString("es-CO")}
                                {l.entregadoPor ? ` · ${l.entregadoPor}` : ""}
                                {l.nota ? ` · ${l.nota}` : ""}
                              </div>
                            ))}
                          </AccordionPanel>
                        </AccordionItem>
                      </Accordion>
                    )}
                  </div>
                  <div className={styles.actions}>
                    <Input type="date" value={d.proximaEntrega ?? ""} onChange={(_, val) => cambiarProxima(d.id, val.value)} />
                    <Button appearance="primary" size="small" icon={<CheckmarkCircleRegular />} onClick={() => entregar(d.id)} disabled={!d.activo}>
                      Entregado
                    </Button>
                    <Button appearance="subtle" size="small" icon={<DeleteRegular />} aria-label="Eliminar" onClick={() => borrar(d.id)} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <Divider />
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          Al marcar “Entregado” se registra en el historial y la próxima entrega avanza según la frecuencia.
        </Text>
      </Card>
    </div>
  )
}
