import { PageHeader } from "@/components/shared/PageHeader"
import { ActividadesView } from "@/components/actividades/ActividadesView"

export default function ActividadesPage() {
  return (
    <>
      <PageHeader title="Gestiones CS" subtitle="Repositorio global de gestiones de Customer Success" />
      <ActividadesView />
    </>
  )
}
