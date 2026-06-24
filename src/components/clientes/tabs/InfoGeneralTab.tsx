"use client"

import { makeStyles, tokens, Card, Divider, MessageBar, MessageBarBody } from "@fluentui/react-components"
import { TextF, AreaF, SelectF } from "@/components/clientes/formFields"
import { FieldRow, fmtDate, SectionEditHeader } from "@/components/clientes/fieldDisplay"
import { useSectionEdit } from "@/components/clientes/useSectionEdit"
import type { Account } from "@/types"

const useStyles = makeStyles({
  card: { padding: tokens.spacingHorizontalL },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: tokens.spacingHorizontalL },
  grid2: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: tokens.spacingHorizontalL },
  msg: { marginBottom: tokens.spacingVerticalM },
})

const toDateInput = (d?: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "")

type Values = {
  name: string
  accountnumber: string
  cr_bex_estadocliente: string
  industrycode: string
  address1_city: string
  address1_country: string
  cr_bex_tamanoempresa: string
  websiteurl: string
  cr_bex_primernegocio: string
  description: string
}

export function InfoGeneralTab({ cliente }: { cliente: Account }) {
  const styles = useStyles()
  const defaults: Values = {
    name: cliente.name,
    accountnumber: cliente.accountnumber,
    cr_bex_estadocliente: cliente.cr_bex_estadocliente,
    industrycode: cliente.industrycode ?? "",
    address1_city: cliente.address1_city ?? "",
    address1_country: cliente.address1_country,
    cr_bex_tamanoempresa: cliente.cr_bex_tamanoempresa ?? "",
    websiteurl: cliente.websiteurl ?? "",
    cr_bex_primernegocio: toDateInput(cliente.cr_bex_primernegocio),
    description: cliente.description ?? "",
  }
  const { editing, setEditing, cancel, control, save, saving, error } = useSectionEdit(cliente.id, defaults)

  return (
    <Card className={styles.card}>
      <SectionEditHeader
        title="Información General"
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
        <>
          <div className={styles.grid3}>
            <TextF control={control} name="name" label="Razón Social" required />
            <TextF control={control} name="accountnumber" label="NIT" required />
            <SelectF control={control} name="cr_bex_estadocliente" label="Estado" required catalogKey="ESTADOS_CLIENTE" />
            <SelectF control={control} name="industrycode" label="Industria" catalogKey="INDUSTRIAS" />
            <TextF control={control} name="address1_city" label="Ciudad" />
            <TextF control={control} name="address1_country" label="País" />
            <SelectF control={control} name="cr_bex_tamanoempresa" label="Tamaño de empresa" catalogKey="TAMANOS_EMPRESA" />
            <TextF control={control} name="websiteurl" label="Sitio web" type="url" />
            <TextF control={control} name="cr_bex_primernegocio" label="Fecha primer negocio" type="date" />
          </div>
          <Divider style={{ margin: "12px 0" }} />
          <AreaF control={control} name="description" label="Observaciones" />
        </>
      ) : (
        <>
          <div className={styles.grid3}>
            <FieldRow label="Razón Social" value={cliente.name} />
            <FieldRow label="NIT" value={cliente.accountnumber} />
            <FieldRow label="Estado" value={cliente.cr_bex_estadocliente} />
            <FieldRow label="Industria" value={cliente.industrycode} />
            <FieldRow label="Ciudad" value={cliente.address1_city} />
            <FieldRow label="País" value={cliente.address1_country} />
            <FieldRow label="Tamaño de empresa" value={cliente.cr_bex_tamanoempresa} />
            <FieldRow label="Sitio web" value={cliente.websiteurl} />
            <FieldRow label="Primer negocio" value={fmtDate(cliente.cr_bex_primernegocio)} />
          </div>
          {cliente.description && (
            <>
              <Divider style={{ margin: "12px 0" }} />
              <FieldRow label="Observaciones" value={cliente.description} />
            </>
          )}
        </>
      )}
    </Card>
  )
}
