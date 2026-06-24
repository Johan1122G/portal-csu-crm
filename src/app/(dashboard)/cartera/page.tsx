import { PageHeader } from "@/components/shared/PageHeader"
import { CarteraView } from "@/components/cartera/CarteraView"

export const dynamic = "force-dynamic"

export default function CarteraPage() {
  return (
    <>
      <PageHeader title="Cartera (IA)" subtitle="Salud de todos los clientes — triage de Customer Success" />
      <CarteraView />
    </>
  )
}
