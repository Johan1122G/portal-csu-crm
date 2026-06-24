// ─── Recuperación de tickets (la "herramienta" del Q&A con IA) ───────────────────
// Consulta acotada sobre la tabla de hechos: devuelve solo los tickets relevantes
// a la pregunta (por categoría/texto/estado/fechas), no todos. Así el Q&A con IA
// es barato y rápido (la IA recibe decenas de tickets, no miles).

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

const STATUS_LABEL: Record<number, string> = {
  1: "Nuevo",
  2: "En curso",
  3: "Planificado",
  4: "Pendiente",
  5: "Resuelto",
  6: "Cerrado",
}

export type TicketFiltro = {
  categoria?: string
  texto?: string
  estado?: "abierto" | "cerrado" | "todos"
  desde?: string
  hasta?: string
  limite?: number
}

const parseDay = (s?: string): Date | undefined => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined
  const d = new Date(`${s}T00:00:00Z`)
  return isNaN(d.getTime()) ? undefined : d
}

// Busca tickets del cliente con filtros. Devuelve un resumen compacto por ticket
// (descripción recortada) y el total que cumplió el filtro.
export async function buscarTickets(accountId: string, f: TicketFiltro) {
  const limite = Math.min(Math.max(f.limite ?? 40, 1), 80)

  const where: Prisma.GlpiTicketFactWhereInput = { accountId }
  if (f.categoria) where.category = { contains: f.categoria, mode: "insensitive" }
  if (f.texto)
    where.OR = [
      { subject: { contains: f.texto, mode: "insensitive" } },
      { content: { contains: f.texto, mode: "insensitive" } },
    ]
  if (f.estado === "abierto") where.status = { lt: 5 }
  else if (f.estado === "cerrado") where.status = { gte: 5 }

  const desde = parseDay(f.desde)
  const hasta = parseDay(f.hasta)
  if (desde || hasta) where.openedAt = { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) }

  const [total, rows] = await Promise.all([
    prisma.glpiTicketFact.count({ where }),
    prisma.glpiTicketFact.findMany({
      where,
      orderBy: { openedAt: "desc" },
      take: limite,
      select: {
        glpiTicketId: true,
        subject: true,
        content: true,
        category: true,
        status: true,
        openedAt: true,
        resolutionHours: true,
        satisfaction: true,
      },
    }),
  ])

  return {
    total,
    devueltos: rows.length,
    tickets: rows.map((r) => ({
      id: r.glpiTicketId,
      asunto: r.subject,
      categoria: r.category,
      estado: STATUS_LABEL[r.status] ?? String(r.status),
      fecha: r.openedAt ? r.openedAt.toISOString().slice(0, 10) : null,
      resolucionHoras: r.resolutionHours,
      csat: r.satisfaction,
      descripcion: r.content ? r.content.slice(0, 600) : null,
    })),
  }
}
