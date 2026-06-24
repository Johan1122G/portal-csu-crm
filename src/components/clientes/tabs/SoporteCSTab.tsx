"use client"

import { makeStyles, tokens, Card, MessageBar, MessageBarBody, Subtitle2 } from "@fluentui/react-components"
import { TextF, AreaF, SelectF, SwitchF } from "@/components/clientes/formFields"
import { FieldRow, SectionEditHeader } from "@/components/clientes/fieldDisplay"
import { useSectionEdit } from "@/components/clientes/useSectionEdit"
import type { Account } from "@/types"

const useStyles = makeStyles({
  card: { padding: tokens.spacingHorizontalL },
  grid2: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: tokens.spacingHorizontalXL },
  col: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS },
  switches: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS, marginTop: tokens.spacingVerticalS },
  msg: { marginBottom: tokens.spacingVerticalM },
})

const toStr = (v?: number | string | null) => (v == null ? "" : String(v))

type Values = {
  cr_bex_tienebolsahoras: boolean
  cr_bex_horascontratadas: string
  cr_bex_horasconsumidas: string
  cr_bex_nivelsatisfaccion: string
  cr_bex_principalessolicitudes: string
  cr_bex_niveladopcion: string
  cr_bex_potencialcrecimiento: string
  cr_bex_clienteestrategico: boolean
  cr_bex_casoexito: boolean
  cr_bex_acompanamientoprioritario: boolean
  cr_bex_comentarioscs: string
}

export function SoporteCSTab({ cliente }: { cliente: Account }) {
  const styles = useStyles()
  const defaults: Values = {
    cr_bex_tienebolsahoras: cliente.cr_bex_tienebolsahoras,
    cr_bex_horascontratadas: toStr(cliente.cr_bex_horascontratadas),
    cr_bex_horasconsumidas: toStr(cliente.cr_bex_horasconsumidas),
    cr_bex_nivelsatisfaccion: toStr(cliente.cr_bex_nivelsatisfaccion),
    cr_bex_principalessolicitudes: cliente.cr_bex_principalessolicitudes ?? "",
    cr_bex_niveladopcion: cliente.cr_bex_niveladopcion ?? "",
    cr_bex_potencialcrecimiento: cliente.cr_bex_potencialcrecimiento ?? "",
    cr_bex_clienteestrategico: cliente.cr_bex_clienteestrategico,
    cr_bex_casoexito: cliente.cr_bex_casoexito,
    cr_bex_acompanamientoprioritario: cliente.cr_bex_acompanamientoprioritario,
    cr_bex_comentarioscs: cliente.cr_bex_comentarioscs ?? "",
  }
  const { editing, setEditing, cancel, control, save, saving, error } = useSectionEdit(cliente.id, defaults)

  return (
    <Card className={styles.card}>
      <SectionEditHeader
        title="Soporte / Customer Success"
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
          <div className={styles.col}>
            <Subtitle2>Soporte</Subtitle2>
            <SwitchF control={control} name="cr_bex_tienebolsahoras" label="Tiene bolsa de horas" />
            <TextF control={control} name="cr_bex_horascontratadas" label="Horas contratadas" type="number" />
            <TextF control={control} name="cr_bex_horasconsumidas" label="Horas consumidas" type="number" />
            <TextF control={control} name="cr_bex_nivelsatisfaccion" label="Nivel de satisfacción (0-10)" type="number" />
            <AreaF control={control} name="cr_bex_principalessolicitudes" label="Principales solicitudes" />
          </div>
          <div className={styles.col}>
            <Subtitle2>Customer Success</Subtitle2>
            <SelectF control={control} name="cr_bex_niveladopcion" label="Nivel de adopción" catalogKey="NIVELES_ADOPCION" />
            <SelectF control={control} name="cr_bex_potencialcrecimiento" label="Potencial de crecimiento" catalogKey="POTENCIAL_CRECIMIENTO" />
            <div className={styles.switches}>
              <SwitchF control={control} name="cr_bex_clienteestrategico" label="Cliente estratégico" />
              <SwitchF control={control} name="cr_bex_casoexito" label="Caso de éxito" />
              <SwitchF control={control} name="cr_bex_acompanamientoprioritario" label="Acompañamiento prioritario" />
            </div>
            <AreaF control={control} name="cr_bex_comentarioscs" label="Comentarios CS" />
          </div>
        </div>
      ) : (
        <div className={styles.grid2}>
          <div className={styles.col}>
            <Subtitle2>Soporte</Subtitle2>
            <FieldRow label="¿Tiene bolsa de horas?" value={cliente.cr_bex_tienebolsahoras ? "Sí" : "No"} />
            <FieldRow label="Horas contratadas" value={cliente.cr_bex_horascontratadas} />
            <FieldRow label="Horas consumidas" value={cliente.cr_bex_horasconsumidas} />
            <FieldRow
              label="Nivel de satisfacción"
              value={cliente.cr_bex_nivelsatisfaccion != null ? `${cliente.cr_bex_nivelsatisfaccion}/10` : null}
            />
            <FieldRow label="Principales solicitudes" value={cliente.cr_bex_principalessolicitudes} />
          </div>
          <div className={styles.col}>
            <Subtitle2>Customer Success</Subtitle2>
            <FieldRow label="Nivel de adopción" value={cliente.cr_bex_niveladopcion} />
            <FieldRow label="Potencial de crecimiento" value={cliente.cr_bex_potencialcrecimiento} />
            <FieldRow label="Cliente estratégico" value={cliente.cr_bex_clienteestrategico ? "Sí" : "No"} />
            <FieldRow label="Caso de éxito" value={cliente.cr_bex_casoexito ? "Sí" : "No"} />
            <FieldRow label="Acompañamiento prioritario" value={cliente.cr_bex_acompanamientoprioritario ? "Sí" : "No"} />
            <FieldRow label="Comentarios CS" value={cliente.cr_bex_comentarioscs} />
          </div>
        </div>
      )}
    </Card>
  )
}
