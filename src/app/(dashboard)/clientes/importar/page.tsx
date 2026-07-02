import { PageHeader } from "@/components/shared/PageHeader"
import { BulkImportView } from "@/components/clientes/BulkImportView"

export const dynamic = "force-dynamic"

export default function ImportarClientesPage() {
  return (
    <>
      <PageHeader
        title="Importar datos de clientes"
        subtitle="Carga masiva desde un único Excel — una fila por cliente"
      />
      <BulkImportView />
    </>
  )
}
