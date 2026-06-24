import { PageHeader } from "@/components/shared/PageHeader"
import { CatalogManager } from "@/components/catalog/CatalogManager"

export default function ConfiguracionPage() {
  return (
    <>
      <PageHeader
        title="Configuración — Catálogos"
        subtitle="Administra los valores de todas las listas desplegables (roles, áreas, categorías, etc.)"
      />
      <CatalogManager />
    </>
  )
}
