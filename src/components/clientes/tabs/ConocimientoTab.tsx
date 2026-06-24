"use client"

import { makeStyles, tokens, Card, MessageBar, MessageBarBody } from "@fluentui/react-components"
import { AreaF } from "@/components/clientes/formFields"
import { FieldRow, SectionEditHeader } from "@/components/clientes/fieldDisplay"
import { useSectionEdit } from "@/components/clientes/useSectionEdit"
import type { Account } from "@/types"

const useStyles = makeStyles({
  card: { padding: tokens.spacingHorizontalL },
  grid2: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: tokens.spacingHorizontalL },
  msg: { marginBottom: tokens.spacingVerticalM },
})

type Values = {
  cr_bex_principalesretos: string
  cr_bex_principalesdolores: string
  cr_bex_objetivosestrategicos: string
  cr_bex_expectativasbext: string
  cr_bex_riesgosidentificados: string
  cr_bex_oportunidades: string
}

export function ConocimientoTab({ cliente }: { cliente: Account }) {
  const styles = useStyles()
  const defaults: Values = {
    cr_bex_principalesretos: cliente.cr_bex_principalesretos ?? "",
    cr_bex_principalesdolores: cliente.cr_bex_principalesdolores ?? "",
    cr_bex_objetivosestrategicos: cliente.cr_bex_objetivosestrategicos ?? "",
    cr_bex_expectativasbext: cliente.cr_bex_expectativasbext ?? "",
    cr_bex_riesgosidentificados: cliente.cr_bex_riesgosidentificados ?? "",
    cr_bex_oportunidades: cliente.cr_bex_oportunidades ?? "",
  }
  const { editing, setEditing, cancel, control, save, saving, error } = useSectionEdit(cliente.id, defaults)

  return (
    <Card className={styles.card}>
      <SectionEditHeader
        title="Conocimiento del Cliente"
        editing={editing}
        saving={saving}
        onEdit={() => setEditing(true)}
        onSave={save}
        onCancel={cancel}
      />
      {error && (
        <MessageBar intent="error" className={styles.msg}>
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      {editing ? (
        <div className={styles.grid2}>
          <AreaF control={control} name="cr_bex_principalesretos" label="Principales retos" />
          <AreaF control={control} name="cr_bex_principalesdolores" label="Principales dolores" />
          <AreaF control={control} name="cr_bex_objetivosestrategicos" label="Objetivos estratégicos" />
          <AreaF control={control} name="cr_bex_expectativasbext" label="Expectativas con BEXT" />
          <AreaF control={control} name="cr_bex_riesgosidentificados" label="Riesgos identificados" />
          <AreaF control={control} name="cr_bex_oportunidades" label="Oportunidades" />
        </div>
      ) : (
        <div className={styles.grid2}>
          <FieldRow label="Principales retos" value={cliente.cr_bex_principalesretos} />
          <FieldRow label="Principales dolores" value={cliente.cr_bex_principalesdolores} />
          <FieldRow label="Objetivos estratégicos" value={cliente.cr_bex_objetivosestrategicos} />
          <FieldRow label="Expectativas con BEXT" value={cliente.cr_bex_expectativasbext} />
          <FieldRow label="Riesgos identificados" value={cliente.cr_bex_riesgosidentificados} />
          <FieldRow label="Oportunidades" value={cliente.cr_bex_oportunidades} />
        </div>
      )}
    </Card>
  )
}
