import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/PageHeader"
import { DashboardView } from "@/components/dashboard/DashboardView"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() + 7)

  const [
    activos,
    estrategicos,
    oppPendientes,
    reunionesSemana,
    horasPorCliente,
    satisfaccionClientes,
    ultimasActividades,
    proximasReuniones,
  ] = await Promise.all([
    prisma.account.count({ where: { cr_bex_estadocliente: "Activo" } }),
    prisma.account.count({ where: { cr_bex_clienteestrategico: true } }),
    prisma.opportunityRecommendation.count({
      where: { statecode: { in: ["Pendiente", "En proceso"] } },
    }),
    prisma.bextRelationship.count({
      where: { cr_bex_proximareunion: { gte: now, lte: weekEnd } },
    }),
    // Horas por cliente: solo los que tienen bolsa de horas o horas contratadas.
    prisma.account.findMany({
      where: {
        OR: [{ cr_bex_tienebolsahoras: true }, { cr_bex_horascontratadas: { gt: 0 } }],
      },
      select: {
        id: true,
        name: true,
        cr_bex_horascontratadas: true,
        cr_bex_horasconsumidas: true,
      },
    }),
    // Satisfacción por cliente: solo los que tienen un nivel registrado (0-10).
    prisma.account.findMany({
      where: { cr_bex_nivelsatisfaccion: { not: null } },
      select: {
        id: true,
        name: true,
        cr_bex_nivelsatisfaccion: true,
        cr_bex_niveladopcion: true,
      },
    }),
    prisma.cSActivity.findMany({
      orderBy: { scheduledstart: "desc" },
      take: 5,
      include: { account: { select: { id: true, name: true } } },
    }),
    prisma.bextRelationship.findMany({
      where: { cr_bex_proximareunion: { gte: now } },
      orderBy: { cr_bex_proximareunion: "asc" },
      take: 5,
      include: { account: { select: { id: true, name: true } } },
    }),
  ])

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Customer Success y Soporte — vista general" />
      <DashboardView
        data={{
          activos,
          estrategicos,
          oppPendientes,
          reunionesSemana,
          horasPorCliente: horasPorCliente.map((c) => ({
            id: c.id,
            name: c.name,
            contratadas: c.cr_bex_horascontratadas ?? 0,
            consumidas: c.cr_bex_horasconsumidas ?? 0,
          })),
          satisfaccionClientes: satisfaccionClientes.map((c) => ({
            id: c.id,
            name: c.name,
            score: c.cr_bex_nivelsatisfaccion ?? 0,
            adopcion: c.cr_bex_niveladopcion,
          })),
          ultimasActividades,
          proximasReuniones,
        }}
      />
    </>
  )
}
