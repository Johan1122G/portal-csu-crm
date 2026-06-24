import { PageHeader } from "@/components/shared/PageHeader"
import { ClienteGrid } from "@/components/clientes/ClienteGrid"

export default function ClientesPage() {
  return (
    <>
      <PageHeader title="Clientes" subtitle="Hoja de Vida 360° de cada cliente" />
      <ClienteGrid />
    </>
  )
}
