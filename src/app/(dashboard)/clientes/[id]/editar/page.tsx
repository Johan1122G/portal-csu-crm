import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/PageHeader"
import { ClienteEditForm } from "@/components/clientes/ClienteEditForm"

export default async function EditarClientePage({ params }: { params: { id: string } }) {
  const cliente = await prisma.account.findUnique({ where: { id: params.id } })
  if (!cliente) notFound()

  return (
    <>
      <PageHeader title={`Editar — ${cliente.name}`} subtitle="Actualiza la información del cliente" />
      <ClienteEditForm cliente={cliente} />
    </>
  )
}
