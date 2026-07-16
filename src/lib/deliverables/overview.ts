// ─── Resumen global de entregables (valor agregado) ──────────────────────────────
// Lista todos los entregables con su cliente y estado (vencido/próximo/al día).
// Reusado por la página /valor-agregado, el endpoint de notificaciones y el Digest.

import { prisma } from "@/lib/prisma"
import { estadoEntrega, diasParaVencer, type EstadoEntrega } from "@/lib/deliverables/cadence"

export type DeliverableRow = {
  id: string
  accountId: string
  cliente: string
  nombre: string
  categoria: string | null
  frecuencia: string
  responsable: string | null
  proximaEntrega: string | null
  ultimaEntrega: string | null
  dias: number | null
  estado: EstadoEntrega
}

export type DeliverablesOverview = {
  generatedAt: string
  rows: DeliverableRow[]
  counts: { vencidos: number; proximos: number; alDia: number; activos: number; total: number }
}

const ordenEstado: Record<EstadoEntrega, number> = { vencido: 0, proximo: 1, alDia: 2, sinFecha: 3, inactivo: 4 }

export async function computeDeliverables(): Promise<DeliverablesOverview> {
  const now = new Date()
  const items = await prisma.deliverable.findMany({
    include: { account: { select: { name: true } } },
  })

  const rows: DeliverableRow[] = items
    .map((d) => {
      const estado = estadoEntrega({
        activo: d.activo,
        proximaEntrega: d.proximaEntrega,
        notificarDiasAntes: d.notificarDiasAntes,
        ahora: now,
      })
      return {
        id: d.id,
        accountId: d.accountId,
        cliente: d.account.name,
        nombre: d.nombre,
        categoria: d.categoria,
        frecuencia: d.frecuencia,
        responsable: d.responsable,
        proximaEntrega: d.proximaEntrega ? d.proximaEntrega.toISOString().slice(0, 10) : null,
        ultimaEntrega: d.ultimaEntrega ? d.ultimaEntrega.toISOString().slice(0, 10) : null,
        dias: diasParaVencer(d.proximaEntrega, now),
        estado,
      }
    })
    .sort((a, b) => ordenEstado[a.estado] - ordenEstado[b.estado] || (a.dias ?? 9999) - (b.dias ?? 9999))

  const counts = {
    vencidos: rows.filter((r) => r.estado === "vencido").length,
    proximos: rows.filter((r) => r.estado === "proximo").length,
    alDia: rows.filter((r) => r.estado === "alDia").length,
    activos: rows.filter((r) => r.estado !== "inactivo").length,
    total: rows.length,
  }

  return { generatedAt: now.toISOString(), rows, counts }
}
