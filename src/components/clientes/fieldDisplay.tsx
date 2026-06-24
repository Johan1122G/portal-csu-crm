"use client"

import { makeStyles, tokens, Text, Subtitle2, Button } from "@fluentui/react-components"
import { EditRegular, SaveRegular, DismissRegular } from "@fluentui/react-icons"
import { format } from "date-fns"

export const fmtDate = (d?: Date | string | null) => (d ? format(new Date(d), "dd/MM/yyyy") : "—")
export const fmtValue = (s?: string | number | null) => (s == null || s === "" ? "—" : String(s))

const useStyles = makeStyles({
  field: { display: "flex", flexDirection: "column", gap: "2px", marginBottom: tokens.spacingVerticalS },
  label: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalM,
  },
  actions: { display: "flex", gap: tokens.spacingHorizontalS },
})

export function FieldRow({ label, value }: { label: string; value?: string | number | null }) {
  const styles = useStyles()
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <Text>{fmtValue(value)}</Text>
    </div>
  )
}

// Cabecera de una sección editable: título + botón Editar (lectura) o Guardar/Cancelar (edición).
export function SectionEditHeader({
  title,
  editing,
  saving,
  onEdit,
  onSave,
  onCancel,
}: {
  title: string
  editing: boolean
  saving: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
}) {
  const styles = useStyles()
  return (
    <div className={styles.header}>
      <Subtitle2>{title}</Subtitle2>
      {editing ? (
        <div className={styles.actions}>
          <Button appearance="secondary" icon={<DismissRegular />} onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button appearance="primary" icon={<SaveRegular />} onClick={onSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      ) : (
        <Button appearance="secondary" size="small" icon={<EditRegular />} onClick={onEdit}>
          Editar
        </Button>
      )}
    </div>
  )
}
