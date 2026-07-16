import { PageHeader } from "@/components/shared/PageHeader"
import { ValorAgregadoView } from "@/components/valor-agregado/ValorAgregadoView"

export const dynamic = "force-dynamic"

export default function ValorAgregadoPage() {
  return (
    <>
      <PageHeader
        title="Valor agregado"
        subtitle="Entregables recurrentes de todos los clientes — próximos y vencidos"
      />
      <ValorAgregadoView />
    </>
  )
}
