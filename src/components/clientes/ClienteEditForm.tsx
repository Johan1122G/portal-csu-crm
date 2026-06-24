"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import {
  makeStyles,
  tokens,
  Button,
  Card,
  Subtitle2,
  Divider,
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components"
import { SaveRegular, DismissRegular } from "@fluentui/react-icons"
import { TextF, AreaF, SelectF, SwitchF } from "@/components/clientes/formFields"
import type { Account } from "@/types"

const useStyles = makeStyles({
  section: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM, marginBottom: tokens.spacingVerticalXL },
  grid2: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: tokens.spacingHorizontalL },
  switches: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS },
  footer: { display: "flex", justifyContent: "flex-end", gap: tokens.spacingHorizontalS, marginTop: tokens.spacingVerticalXL },
  card: { padding: tokens.spacingHorizontalXL },
})

// Date → yyyy-MM-dd para inputs type=date.
const toDateInput = (d?: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "")
const toStr = (v?: number | string | null) => (v == null ? "" : String(v))

// Valores de formulario (campos amigables para inputs). La coerción fuerte
// (fechas, enteros) la hace el servidor con updateClienteSchema en el PUT.
type EditFormValues = {
  name: string
  accountnumber: string
  cr_bex_estadocliente: string
  industrycode: string
  address1_city: string
  address1_country: string
  cr_bex_tamanoempresa: string
  websiteurl: string
  cr_bex_primernegocio: string
  cr_bex_principalesretos: string
  cr_bex_principalesdolores: string
  cr_bex_objetivosestrategicos: string
  cr_bex_expectativasbext: string
  cr_bex_riesgosidentificados: string
  cr_bex_oportunidades: string
  cr_bex_tienebolsahoras: boolean
  cr_bex_horascontratadas: string
  cr_bex_horasconsumidas: string
  cr_bex_nivelsatisfaccion: string
  cr_bex_principalessolicitudes: string
  cr_bex_niveladopcion: string
  cr_bex_clienteestrategico: boolean
  cr_bex_casoexito: boolean
  cr_bex_potencialcrecimiento: string
  cr_bex_acompanamientoprioritario: boolean
  cr_bex_comentarioscs: string
  description: string
}

export function ClienteEditForm({ cliente }: { cliente: Account }) {
  const styles = useStyles()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { control, handleSubmit } = useForm<EditFormValues>({
    defaultValues: {
      name: cliente.name,
      accountnumber: cliente.accountnumber,
      cr_bex_estadocliente: cliente.cr_bex_estadocliente,
      industrycode: cliente.industrycode ?? "",
      address1_city: cliente.address1_city ?? "",
      address1_country: cliente.address1_country,
      cr_bex_tamanoempresa: cliente.cr_bex_tamanoempresa ?? "",
      websiteurl: cliente.websiteurl ?? "",
      cr_bex_primernegocio: toDateInput(cliente.cr_bex_primernegocio),
      cr_bex_principalesretos: cliente.cr_bex_principalesretos ?? "",
      cr_bex_principalesdolores: cliente.cr_bex_principalesdolores ?? "",
      cr_bex_objetivosestrategicos: cliente.cr_bex_objetivosestrategicos ?? "",
      cr_bex_expectativasbext: cliente.cr_bex_expectativasbext ?? "",
      cr_bex_riesgosidentificados: cliente.cr_bex_riesgosidentificados ?? "",
      cr_bex_oportunidades: cliente.cr_bex_oportunidades ?? "",
      cr_bex_tienebolsahoras: cliente.cr_bex_tienebolsahoras,
      cr_bex_horascontratadas: toStr(cliente.cr_bex_horascontratadas),
      cr_bex_horasconsumidas: toStr(cliente.cr_bex_horasconsumidas),
      cr_bex_nivelsatisfaccion: toStr(cliente.cr_bex_nivelsatisfaccion),
      cr_bex_principalessolicitudes: cliente.cr_bex_principalessolicitudes ?? "",
      cr_bex_niveladopcion: cliente.cr_bex_niveladopcion ?? "",
      cr_bex_clienteestrategico: cliente.cr_bex_clienteestrategico,
      cr_bex_casoexito: cliente.cr_bex_casoexito,
      cr_bex_potencialcrecimiento: cliente.cr_bex_potencialcrecimiento ?? "",
      cr_bex_acompanamientoprioritario: cliente.cr_bex_acompanamientoprioritario,
      cr_bex_comentarioscs: cliente.cr_bex_comentarioscs ?? "",
      description: cliente.description ?? "",
    },
  })

  async function onSubmit(data: EditFormValues) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "No se pudo guardar")
        return
      }
      router.push(`/clientes/${cliente.id}`)
      router.refresh()
    } catch {
      setError("Error de red al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {error && (
        <MessageBar intent="error" style={{ marginBottom: 16 }}>
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      <Card className={styles.card}>
        <div className={styles.section}>
          <Subtitle2>Información General</Subtitle2>
          <div className={styles.grid2}>
            <TextF control={control} name="name" label="Razón Social" required />
            <TextF control={control} name="accountnumber" label="NIT" required placeholder="Único" />
            <SelectF control={control} name="cr_bex_estadocliente" label="Estado" required catalogKey="ESTADOS_CLIENTE" />
            <SelectF control={control} name="industrycode" label="Industria" catalogKey="INDUSTRIAS" />
            <TextF control={control} name="address1_city" label="Ciudad" />
            <TextF control={control} name="address1_country" label="País" />
            <SelectF control={control} name="cr_bex_tamanoempresa" label="Tamaño de empresa" catalogKey="TAMANOS_EMPRESA" />
            <TextF control={control} name="websiteurl" label="Sitio web" type="url" />
            <TextF control={control} name="cr_bex_primernegocio" label="Fecha primer negocio" type="date" />
          </div>
        </div>

        <Divider />

        <div className={styles.section}>
          <Subtitle2>Conocimiento del Cliente</Subtitle2>
          <div className={styles.grid2}>
            <AreaF control={control} name="cr_bex_principalesretos" label="Principales retos" />
            <AreaF control={control} name="cr_bex_principalesdolores" label="Principales dolores" />
            <AreaF control={control} name="cr_bex_objetivosestrategicos" label="Objetivos estratégicos" />
            <AreaF control={control} name="cr_bex_expectativasbext" label="Expectativas con BEXT" />
            <AreaF control={control} name="cr_bex_riesgosidentificados" label="Riesgos identificados" />
            <AreaF control={control} name="cr_bex_oportunidades" label="Oportunidades" />
          </div>
        </div>

        <Divider />

        <div className={styles.grid2}>
          <div className={styles.section}>
            <Subtitle2>Soporte</Subtitle2>
            <SwitchF control={control} name="cr_bex_tienebolsahoras" label="Tiene bolsa de horas" />
            <TextF control={control} name="cr_bex_horascontratadas" label="Horas contratadas" type="number" />
            <TextF control={control} name="cr_bex_horasconsumidas" label="Horas consumidas" type="number" />
            <TextF control={control} name="cr_bex_nivelsatisfaccion" label="Nivel de satisfacción (0-10)" type="number" />
            <AreaF control={control} name="cr_bex_principalessolicitudes" label="Principales solicitudes" />
          </div>
          <div className={styles.section}>
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

        <Divider />

        <div className={styles.section}>
          <Subtitle2>Observaciones Generales</Subtitle2>
          <AreaF control={control} name="description" label="Observaciones" />
        </div>
      </Card>

      <div className={styles.footer}>
        <Button appearance="secondary" icon={<DismissRegular />} type="button" onClick={() => router.push(`/clientes/${cliente.id}`)}>
          Cancelar
        </Button>
        <Button appearance="primary" icon={<SaveRegular />} type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  )
}
