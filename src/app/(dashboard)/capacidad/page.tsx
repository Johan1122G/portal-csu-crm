import { PageHeader } from "@/components/shared/PageHeader"
import { CapacidadView } from "@/components/capacidad/CapacidadView"

export const dynamic = "force-dynamic"

export default function CapacidadPage() {
  return (
    <>
      <PageHeader
        title="Proyección de capacidad"
        subtitle="Pronóstico de tickets y horas + bolsas próximas a agotarse"
      />
      <CapacidadView />
    </>
  )
}
