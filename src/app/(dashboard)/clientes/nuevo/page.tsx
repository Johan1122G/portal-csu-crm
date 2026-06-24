import { PageHeader } from "@/components/shared/PageHeader"
import { ClienteForm } from "@/components/clientes/ClienteForm"

export default function NuevoClientePage() {
  return (
    <>
      <PageHeader title="Nuevo cliente" subtitle="Completa las 3 secciones del formulario" />
      <ClienteForm />
    </>
  )
}
