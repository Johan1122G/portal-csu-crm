"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import {
  makeStyles,
  tokens,
  Button,
  Card,
  Text,
  Subtitle2,
  Divider,
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components"
import { AddRegular, DeleteRegular, ArrowLeftRegular, ArrowRightRegular, SaveRegular } from "@fluentui/react-icons"
import { TextF, AreaF, SelectF, SwitchF } from "@/components/clientes/formFields"

// Form values: campos amigables para inputs (strings/bools). La validación/
// coerción fuerte (fechas, enteros, NIT único) corre en el servidor con zod.
type ContactForm = {
  cr_bex_tipocontacto: string
  fullname: string
  jobtitle?: string
  telephone1?: string
  emailaddress1: string
}
type RelForm = {
  cr_bex_rolbext: string
  cr_bex_nombrepersona: string
  cr_bex_frecuenciacontacto?: string
  cr_bex_nivelrelacionamiento?: string
  cr_bex_ultimareunion?: string
  cr_bex_proximareunion?: string
}
type FormValues = {
  name: string
  accountnumber: string
  cr_bex_estadocliente: string
  industrycode?: string
  address1_city?: string
  address1_country: string
  cr_bex_tamanoempresa?: string
  websiteurl?: string
  cr_bex_primernegocio?: string
  cr_bex_principalesretos?: string
  cr_bex_principalesdolores?: string
  cr_bex_objetivosestrategicos?: string
  cr_bex_expectativasbext?: string
  cr_bex_riesgosidentificados?: string
  cr_bex_oportunidades?: string
  cr_bex_tienebolsahoras: boolean
  cr_bex_horascontratadas?: string
  cr_bex_horasconsumidas?: string
  cr_bex_nivelsatisfaccion?: string
  cr_bex_principalessolicitudes?: string
  cr_bex_niveladopcion?: string
  cr_bex_clienteestrategico: boolean
  cr_bex_casoexito: boolean
  cr_bex_potencialcrecimiento?: string
  cr_bex_acompanamientoprioritario: boolean
  cr_bex_comentarioscs?: string
  description?: string
  contacts: ContactForm[]
  relationships: RelForm[]
}

const useStyles = makeStyles({
  steps: { display: "flex", gap: tokens.spacingHorizontalM, marginBottom: tokens.spacingVerticalXL, flexWrap: "wrap" },
  step: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground3,
  },
  stepActive: {
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke2}`,
    color: tokens.colorBrandForeground2,
    fontWeight: tokens.fontWeightSemibold,
  },
  stepNum: {
    width: "24px",
    height: "24px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: tokens.fontSizeBase200,
  },
  stepNumActive: { backgroundColor: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand },
  section: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalM, marginBottom: tokens.spacingVerticalXL },
  grid2: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: tokens.spacingHorizontalL },
  itemCard: { marginBottom: tokens.spacingVerticalM, padding: tokens.spacingHorizontalL },
  itemHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.spacingVerticalS },
  footer: { display: "flex", justifyContent: "space-between", marginTop: tokens.spacingVerticalXL },
  switches: { display: "flex", flexDirection: "column", gap: tokens.spacingVerticalS },
})

const STEPS = ["Información General + Contactos", "Relacionamiento + Conocimiento", "Soporte / CS + Observaciones"]

export function ClienteForm() {
  const styles = useStyles()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { control, handleSubmit, trigger } = useForm<FormValues>({
    defaultValues: {
      name: "",
      accountnumber: "",
      cr_bex_estadocliente: "Activo",
      address1_country: "Colombia",
      cr_bex_tienebolsahoras: false,
      cr_bex_clienteestrategico: false,
      cr_bex_casoexito: false,
      cr_bex_acompanamientoprioritario: false,
      contacts: [],
      relationships: [],
    },
  })

  const contacts = useFieldArray({ control, name: "contacts" })
  const relationships = useFieldArray({ control, name: "relationships" })

  // Valida solo los campos requeridos del paso actual antes de avanzar.
  async function next() {
    const fieldsByStep: (keyof FormValues)[][] = [["name", "accountnumber", "cr_bex_estadocliente"], [], []]
    const ok = await trigger(fieldsByStep[step])
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  async function onSubmit(data: FormValues) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        setSubmitError(json.error ?? "No se pudo crear el cliente")
        return
      }
      router.push(`/clientes/${json.id}`)
    } catch {
      setSubmitError("Error de red al crear el cliente")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className={styles.steps}>
        {STEPS.map((label, i) => (
          <div key={i} className={`${styles.step} ${i === step ? styles.stepActive : ""}`}>
            <span className={`${styles.stepNum} ${i === step ? styles.stepNumActive : ""}`}>{i + 1}</span>
            <Text>{label}</Text>
          </div>
        ))}
      </div>

      {submitError && (
        <MessageBar intent="error" style={{ marginBottom: 16 }}>
          <MessageBarBody>{submitError}</MessageBarBody>
        </MessageBar>
      )}

      {/* ── Paso 1 ── */}
      {step === 0 && (
        <>
          <div className={styles.section}>
            <Subtitle2>Información General</Subtitle2>
            <div className={styles.grid2}>
              <TextF control={control} name="name" label="Razón Social" required />
              <TextF control={control} name="accountnumber" label="NIT" required placeholder="Único e inmutable" />
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
            <div className={styles.itemHead}>
              <Subtitle2>Contactos</Subtitle2>
              <Button
                appearance="secondary"
                type="button"
                icon={<AddRegular />}
                onClick={() => contacts.append({ cr_bex_tipocontacto: "Principal", fullname: "", emailaddress1: "" })}
              >
                Agregar contacto
              </Button>
            </div>
            {contacts.fields.map((f, i) => (
              <Card key={f.id} className={styles.itemCard}>
                <div className={styles.itemHead}>
                  <Text weight="semibold">Contacto {i + 1}</Text>
                  <Button appearance="subtle" type="button" icon={<DeleteRegular />} onClick={() => contacts.remove(i)} aria-label="Eliminar" />
                </div>
                <div className={styles.grid2}>
                  <SelectF control={control} name={`contacts.${i}.cr_bex_tipocontacto`} label="Tipo" required catalogKey="TIPOS_CONTACTO" />
                  <TextF control={control} name={`contacts.${i}.fullname`} label="Nombre completo" required />
                  <TextF control={control} name={`contacts.${i}.jobtitle`} label="Cargo" />
                  <TextF control={control} name={`contacts.${i}.telephone1`} label="Teléfono" type="tel" />
                  <TextF control={control} name={`contacts.${i}.emailaddress1`} label="Correo" required />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── Paso 2 ── */}
      {step === 1 && (
        <>
          <div className={styles.section}>
            <div className={styles.itemHead}>
              <Subtitle2>Relacionamiento BEXT</Subtitle2>
              <Button
                appearance="secondary"
                type="button"
                icon={<AddRegular />}
                onClick={() => relationships.append({ cr_bex_rolbext: "Ejecutivo Comercial", cr_bex_nombrepersona: "" })}
              >
                Agregar persona BEXT
              </Button>
            </div>
            {relationships.fields.map((f, i) => (
              <Card key={f.id} className={styles.itemCard}>
                <div className={styles.itemHead}>
                  <Text weight="semibold">Persona BEXT {i + 1}</Text>
                  <Button appearance="subtle" type="button" icon={<DeleteRegular />} onClick={() => relationships.remove(i)} aria-label="Eliminar" />
                </div>
                <div className={styles.grid2}>
                  <SelectF control={control} name={`relationships.${i}.cr_bex_rolbext`} label="Rol" required catalogKey="ROLES_BEXT" />
                  <TextF control={control} name={`relationships.${i}.cr_bex_nombrepersona`} label="Nombre" required />
                  <SelectF control={control} name={`relationships.${i}.cr_bex_frecuenciacontacto`} label="Frecuencia" catalogKey="FRECUENCIAS_CONTACTO" />
                  <SelectF control={control} name={`relationships.${i}.cr_bex_nivelrelacionamiento`} label="Nivel" catalogKey="NIVELES_RELACIONAMIENTO" />
                  <TextF control={control} name={`relationships.${i}.cr_bex_ultimareunion`} label="Última reunión" type="date" />
                  <TextF control={control} name={`relationships.${i}.cr_bex_proximareunion`} label="Próxima reunión" type="date" />
                </div>
              </Card>
            ))}
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
        </>
      )}

      {/* ── Paso 3 ── */}
      {step === 2 && (
        <>
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
        </>
      )}

      <div className={styles.footer}>
        <Button
          appearance="secondary"
          icon={<ArrowLeftRegular />}
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          type="button"
        >
          Atrás
        </Button>
        {step < STEPS.length - 1 ? (
          <Button appearance="primary" icon={<ArrowRightRegular />} iconPosition="after" onClick={next} type="button">
            Siguiente
          </Button>
        ) : (
          <Button appearance="primary" icon={<SaveRegular />} type="submit" disabled={submitting}>
            {submitting ? "Guardando…" : "Crear cliente"}
          </Button>
        )}
      </div>
    </form>
  )
}
