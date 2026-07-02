import { notFound } from "next/navigation"
import { computeQbr } from "@/lib/analytics/qbr"
import { QbrReport } from "@/components/qbr/QbrReport"

export const dynamic = "force-dynamic"

// Server-render sin narrativa IA (barato); el botón "Resumen ejecutivo (IA)" del
// reporte la añade bajo demanda vía /api/clientes/[id]/qbr?narrativa=1.
export default async function QbrPage({ params }: { params: { id: string } }) {
  const qbr = await computeQbr(params.id, { conNarrativa: false })
  if (!qbr) notFound()
  return <QbrReport initial={qbr} accountId={params.id} />
}
