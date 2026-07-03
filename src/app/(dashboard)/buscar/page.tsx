import { PageHeader } from "@/components/shared/PageHeader"
import { BuscarView } from "@/components/buscar/BuscarView"

export const dynamic = "force-dynamic"

export default function BuscarPage() {
  return (
    <>
      <PageHeader
        title="Búsqueda semántica"
        subtitle="Busca por significado en los tickets de soporte de todo el histórico"
      />
      <BuscarView />
    </>
  )
}
