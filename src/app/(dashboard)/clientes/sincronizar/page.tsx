import { PageHeader } from "@/components/shared/PageHeader"
import { GLPISync } from "@/components/glpi/GLPISync"

export default function SincronizarGLPIPage() {
  return (
    <>
      <PageHeader
        title="Sincronizar desde GLPI"
        subtitle="Importa o actualiza clientes a partir de las entidades de GLPI"
      />
      <GLPISync />
    </>
  )
}
