import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Cliente360 } from "@/components/clientes/Cliente360"

export default async function ClienteDetailPage({ params }: { params: { id: string } }) {
  const cliente = await prisma.account.findUnique({
    where: { id: params.id },
    include: {
      contacts: { orderBy: { createdon: "asc" } },
      relationships: { orderBy: { createdon: "asc" } },
      products: { orderBy: { createdon: "desc" } },
      activities: { orderBy: { scheduledstart: "desc" } },
      opportunities: { orderBy: { createdon: "desc" } },
    },
  })

  if (!cliente) notFound()

  return <Cliente360 cliente={cliente} />
}
