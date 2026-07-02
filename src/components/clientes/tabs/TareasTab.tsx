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
  Textarea,
  Dropdown,
  Option,
  Checkbox,
  Divider,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from "@fluentui/react-components"
import { SparkleRegular, AddRegular, DeleteRegular, ClipboardTaskListLtrRegular } from "@fluentui/react-icons"
import { PLAYBOOK_TEMPLATES } from "@/lib/playbooks/templates"
import { EmptyState } from "@/components/shared/EmptyState"

type Task = {
  id: string
  titulo: string
  detalle: string | null
  responsable: string | null
  prioridad: string | null
  estado: string
  vence: string | null
  origen: string
  playbookRunId: string | null
  completadaOn: string | null
  createdon: string
}
type Run = {
  id: string
  plantilla: string
  titulo: string
  estado: string
  motivo: string | null
  createdon: string
  tasks: Task[]
}
type Suggestion = { titulo: string; detalle: string; prioridad: string }

const ESTADOS = ["Pendiente", "En progreso", "Hecha", "Descartada"]

const useStyles = makeStyles({
  section: { padding: tokens.spacingHorizontalL, display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM, marginBottom: tokens.spacingVerticalL },
  head: { display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS, flexWrap: "wrap" },
  spacer: { flexGrow: 1 },
  applyRow: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "flex-end", flexWrap: "wrap" },
  taskRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  taskBody: { flexGrow: 1, display: "flex", flexDirection: "column", gap: "2px" },
  taskMeta: { display: "flex", gap: tokens.spacingHorizontalS, alignItems: "center", flexWrap: "wrap", color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  done: { textDecoration: "line-through", color: tokens.colorNeutralForeground3 },
  center: { display: "flex", justifyContent: "center", padding: tokens.spacingVerticalXXL },
  runCard: { padding: tokens.spacingHorizontalL, display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS, borderLeft: `3px solid ${tokens.colorBrandStroke1}`, marginBottom: tokens.spacingVerticalM },
  sugg: { padding: tokens.spacingHorizontalM, display: "flex", flexDirection: "column", gap: "4px", borderLeft: `3px solid ${tokens.colorPaletteYellowBorderActive}` },
  form: { display: "flex", gap: tokens.spacingHorizontalM, alignItems: "flex-end", flexWrap: "wrap" },
  estadoDrop: { minWidth: "130px" },
})

const prioColor = (p: string | null): "danger" | "warning" | "success" | "subtle" =>
  p === "Alta" ? "danger" : p === "Media" ? "warning" : p === "Baja" ? "success" : "subtle"
const fmtVence = (s: string | null) => (s ? new Date(s).toLocaleDateString("es-CO") : null)
const isVencida = (t: Task) => t.vence != null && t.estado !== "Hecha" && t.estado !== "Descartada" && new Date(t.vence) < new Date()

export function TareasTab({ accountId }: { accountId: string }) {
  const styles = useStyles()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)

  // Aplicar playbook
  const [plantilla, setPlantilla] = useState<string>("")
  const [motivo, setMotivo] = useState("")
  const [applying, setApplying] = useState(false)

  // Sugerencias IA
  const [suggs, setSuggs] = useState<Suggestion[] | null>(null)
  const [suggState, setSuggState] = useState<"idle" | "loading" | "unconfigured">("idle")
  const [suggNote, setSuggNote] = useState<string | null>(null)
  const [approved, setApproved] = useState<Record<number, boolean>>({})

  // Crear manual
  const [nuevoTitulo, setNuevoTitulo] = useState("")
  const [nuevoResp, setNuevoResp] = useState("")
  const [nuevaFecha, setNuevaFecha] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const json = await fetch(`/api/clientes/${accountId}/tareas`).then((r) => r.json())
      setTasks(json.tasks ?? [])
      setRuns(json.runs ?? [])
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    load()
  }, [load])

  async function cambiarEstado(id: string, estado: string) {
    // Optimista
    setTasks((ts) => ts?.map((t) => (t.id === id ? { ...t, estado } : t)) ?? ts)
    setRuns((rs) => rs.map((r) => ({ ...r, tasks: r.tasks.map((t) => (t.id === id ? { ...t, estado } : t)) })))
    await fetch(`/api/tareas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    })
  }

  async function borrarTarea(id: string) {
    await fetch(`/api/tareas/${id}`, { method: "DELETE" })
    load()
  }

  async function aplicarPlaybook() {
    if (!plantilla) return
    setApplying(true)
    try {
      await fetch(`/api/clientes/${accountId}/playbooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantilla, motivo: motivo || null }),
      })
      setPlantilla("")
      setMotivo("")
      await load()
    } finally {
      setApplying(false)
    }
  }

  async function borrarRun(runId: string) {
    await fetch(`/api/clientes/${accountId}/playbooks?runId=${runId}`, { method: "DELETE" })
    load()
  }

  async function sugerir() {
    setSuggState("loading")
    setSuggNote(null)
    setSuggs(null)
    setApproved({})
    try {
      const res = await fetch(`/api/clientes/${accountId}/sugerencias`, { method: "POST" })
      const json = await res.json()
      if (json.configured === false) {
        setSuggState("unconfigured")
        return
      }
      if (!res.ok) {
        setSuggNote(json.error ?? "No se pudieron generar sugerencias")
        setSuggState("idle")
        return
      }
      setSuggs(json.acciones ?? [])
      if (json.note) setSuggNote(json.note)
      setSuggState("idle")
    } catch {
      setSuggNote("Error de red al generar sugerencias")
      setSuggState("idle")
    }
  }

  async function aprobar(i: number, s: Suggestion) {
    await fetch(`/api/clientes/${accountId}/tareas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: s.titulo, detalle: s.detalle, prioridad: s.prioridad, origen: "IA" }),
    })
    setApproved((a) => ({ ...a, [i]: true }))
    load()
  }

  async function crearManual() {
    if (!nuevoTitulo.trim()) return
    await fetch(`/api/clientes/${accountId}/tareas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: nuevoTitulo,
        responsable: nuevoResp || null,
        vence: nuevaFecha || null,
        origen: "Manual",
      }),
    })
    setNuevoTitulo("")
    setNuevoResp("")
    setNuevaFecha("")
    load()
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <Spinner label="Cargando plan de trabajo…" />
      </div>
    )
  }

  const sueltas = (tasks ?? []).filter((t) => !t.playbookRunId)
  const tpl = PLAYBOOK_TEMPLATES.find((t) => t.key === plantilla)

  const renderTask = (t: Task) => (
    <div key={t.id} className={styles.taskRow}>
      <Checkbox
        checked={t.estado === "Hecha"}
        onChange={(_, d) => cambiarEstado(t.id, d.checked ? "Hecha" : "Pendiente")}
      />
      <div className={styles.taskBody}>
        <Text weight="semibold" className={t.estado === "Hecha" ? styles.done : undefined}>
          {t.titulo}
        </Text>
        {t.detalle && <Body1 style={{ color: tokens.colorNeutralForeground2 }}>{t.detalle}</Body1>}
        <div className={styles.taskMeta}>
          {t.prioridad && <Badge appearance="tint" color={prioColor(t.prioridad)}>{t.prioridad}</Badge>}
          {t.responsable && <span>👤 {t.responsable}</span>}
          {t.vence && (
            <span style={isVencida(t) ? { color: tokens.colorPaletteRedForeground1, fontWeight: 600 } : undefined}>
              📅 {fmtVence(t.vence)}{isVencida(t) ? " (vencida)" : ""}
            </span>
          )}
          <Badge appearance="outline" color="subtle">{t.origen}</Badge>
        </div>
      </div>
      <Dropdown
        size="small"
        className={styles.estadoDrop}
        value={t.estado}
        selectedOptions={[t.estado]}
        onOptionSelect={(_, d) => d.optionValue && cambiarEstado(t.id, d.optionValue)}
      >
        {ESTADOS.map((e) => (
          <Option key={e} value={e}>{e}</Option>
        ))}
      </Dropdown>
      <Button appearance="subtle" size="small" icon={<DeleteRegular />} aria-label="Eliminar" onClick={() => borrarTarea(t.id)} />
    </div>
  )

  return (
    <>
      {/* ── Playbooks ─────────────────────────────────────────────────────── */}
      <Card className={styles.section}>
        <div className={styles.head}>
          <ClipboardTaskListLtrRegular />
          <Subtitle2>Aplicar un playbook</Subtitle2>
        </div>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          Un playbook genera un checklist estándar de tareas con fechas y responsables sugeridos.
        </Text>
        <div className={styles.applyRow}>
          <Field label="Playbook" style={{ minWidth: "280px" }}>
            <Dropdown
              placeholder="Elige un playbook…"
              value={tpl?.titulo ?? ""}
              selectedOptions={plantilla ? [plantilla] : []}
              onOptionSelect={(_, d) => setPlantilla(d.optionValue ?? "")}
            >
              {PLAYBOOK_TEMPLATES.map((t) => (
                <Option key={t.key} value={t.key} text={t.titulo}>
                  {t.titulo}
                </Option>
              ))}
            </Dropdown>
          </Field>
          <Field label="Motivo (opcional)" style={{ flexGrow: 1, minWidth: "220px" }}>
            <Input value={motivo} onChange={(_, d) => setMotivo(d.value)} placeholder="Ej: cliente en rojo por CSAT bajo" />
          </Field>
          <Button appearance="primary" icon={<AddRegular />} onClick={aplicarPlaybook} disabled={!plantilla || applying}>
            {applying ? "Aplicando…" : "Aplicar"}
          </Button>
        </div>
        {tpl && (
          <MessageBar intent="info">
            <MessageBarBody>
              <b>{tpl.descripcion}</b> — {tpl.cuando} Generará {tpl.tasks.length} tareas.
            </MessageBarBody>
          </MessageBar>
        )}
      </Card>

      {/* ── Acciones sugeridas por IA ─────────────────────────────────────── */}
      <Card className={styles.section}>
        <div className={styles.head}>
          <SparkleRegular />
          <Subtitle2>Acciones sugeridas por IA</Subtitle2>
          <div className={styles.spacer} />
          <Button appearance="primary" icon={<SparkleRegular />} onClick={sugerir} disabled={suggState === "loading"}>
            {suggState === "loading" ? "Analizando…" : "Sugerir acciones"}
          </Button>
        </div>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          La IA propone borradores según la salud y las métricas del cliente. Apruebas las que quieras y se
          convierten en tareas.
        </Text>
        {suggState === "unconfigured" && (
          <MessageBar intent="info">
            <MessageBarBody>
              <MessageBarTitle>IA pendiente de configurar</MessageBarTitle>
              Define <code>AZURE_OPENAI_*</code> para habilitar las sugerencias.
            </MessageBarBody>
          </MessageBar>
        )}
        {suggNote && (
          <MessageBar intent="info">
            <MessageBarBody>{suggNote}</MessageBarBody>
          </MessageBar>
        )}
        {suggs?.map((s, i) => (
          <Card key={i} className={styles.sugg}>
            <div className={styles.head}>
              <Text weight="semibold">{s.titulo}</Text>
              <Badge appearance="tint" color={prioColor(s.prioridad)}>{s.prioridad}</Badge>
            </div>
            {s.detalle && <Body1 style={{ color: tokens.colorNeutralForeground2 }}>{s.detalle}</Body1>}
            <div>
              <Button appearance="primary" size="small" icon={<AddRegular />} disabled={approved[i]} onClick={() => aprobar(i, s)}>
                {approved[i] ? "Agregada ✓" : "Agregar como tarea"}
              </Button>
            </div>
          </Card>
        ))}
        {suggs && suggs.length === 0 && suggState === "idle" && !suggNote && (
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            La IA no encontró acciones urgentes con los datos actuales.
          </Text>
        )}
      </Card>

      {/* ── Playbooks aplicados ───────────────────────────────────────────── */}
      {runs.map((run) => {
        const hechas = run.tasks.filter((t) => t.estado === "Hecha").length
        return (
          <Card key={run.id} className={styles.runCard}>
            <div className={styles.head}>
              <Badge appearance="filled" color="brand">Playbook</Badge>
              <Subtitle2>{run.titulo}</Subtitle2>
              <Badge appearance="tint" color={hechas === run.tasks.length ? "success" : "informative"}>
                {hechas}/{run.tasks.length}
              </Badge>
              <div className={styles.spacer} />
              <Button appearance="subtle" size="small" icon={<DeleteRegular />} onClick={() => borrarRun(run.id)}>
                Quitar
              </Button>
            </div>
            {run.motivo && (
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Motivo: {run.motivo}</Text>
            )}
            <div>{run.tasks.map(renderTask)}</div>
          </Card>
        )
      })}

      {/* ── Tareas sueltas ────────────────────────────────────────────────── */}
      <Card className={styles.section}>
        <Subtitle2>Tareas</Subtitle2>
        <div className={styles.form}>
          <Field label="Nueva tarea" style={{ flexGrow: 1, minWidth: "240px" }}>
            <Input value={nuevoTitulo} onChange={(_, d) => setNuevoTitulo(d.value)} placeholder="Título de la tarea" />
          </Field>
          <Field label="Responsable">
            <Input value={nuevoResp} onChange={(_, d) => setNuevoResp(d.value)} placeholder="Nombre / correo" />
          </Field>
          <Field label="Vence">
            <Input type="date" value={nuevaFecha} onChange={(_, d) => setNuevaFecha(d.value)} />
          </Field>
          <Button appearance="secondary" icon={<AddRegular />} onClick={crearManual} disabled={!nuevoTitulo.trim()}>
            Agregar
          </Button>
        </div>
        <Divider />
        {sueltas.length === 0 ? (
          <EmptyState title="Sin tareas sueltas" description="Crea una arriba o aplica un playbook." />
        ) : (
          <div>{sueltas.map(renderTask)}</div>
        )}
      </Card>
    </>
  )
}
