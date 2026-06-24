import { PageHeader } from "@/components/shared/PageHeader"
import { OportunidadesView } from "@/components/oportunidades/OportunidadesView"

export default function OportunidadesPage() {
  return (
    <>
      <PageHeader title="Oportunidades" subtitle="Oportunidades y recomendaciones de todos los clientes" />
      <OportunidadesView />
    </>
  )
}
