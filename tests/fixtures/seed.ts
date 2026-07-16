// ─── Seed determinístico de pruebas ──────────────────────────────────────────────
// Crea 3 clientes con desenlaces de salud CONOCIDOS para que las aserciones sean
// exactas y estables (independientes de la data real):
//   • TEST-VERDE → salud alta (verde)
//   • TEST-ROJO  → salud baja (rojo) + renovación ≤30d + bolsa por agotarse + sin contacto
//   • TEST-GRIS  → tiene tickets pero SIN señal de contexto → salud indeterminada (gris)
// Los 3 quedan vinculados a GLPI (cr_bex_glpientityid) para aparecer en cartera/digest.

import { subDays, subMonths } from "date-fns"
import { prisma } from "@/lib/prisma"

export const SEED_ACCOUNTS = {
  verde: "TEST-VERDE",
  rojo: "TEST-ROJO",
  gris: "TEST-GRIS",
} as const

type FactSeed = {
  glpiTicketId: number
  openedAt: Date
  category?: string | null
  status?: number
  actiontimeHours?: number
  resolutionHours?: number | null
  satisfaction?: number | null
  isLate?: boolean
  subject?: string
}

function fact(accountId: string, f: FactSeed) {
  return {
    accountId,
    glpiTicketId: f.glpiTicketId,
    subject: f.subject ?? `Ticket ${f.glpiTicketId}`,
    content: null,
    category: f.category ?? "Soporte",
    status: f.status ?? 6,
    openedAt: f.openedAt,
    closedAt: f.status && f.status < 5 ? null : subDays(f.openedAt, -1),
    resolutionHours: f.resolutionHours ?? 4,
    actiontimeHours: f.actiontimeHours ?? 1,
    satisfaction: f.satisfaction ?? null,
    isLate: f.isLate ?? false,
  }
}

// Genera N tickets en un mes dado (offset de meses hacia atrás desde hoy).
function ticketsEnMes(accountId: string, mesesAtras: number, n: number, startId: number, opts: Partial<FactSeed>) {
  const base = subMonths(new Date(), mesesAtras)
  return Array.from({ length: n }, (_, i) =>
    fact(accountId, { glpiTicketId: startId + i, openedAt: subDays(base, i), ...opts }),
  )
}

// Borra los datos de prueba (cascada desde Account) y sus catálogos, y siembra de nuevo.
export async function resetAndSeed() {
  await prisma.account.deleteMany({ where: { accountnumber: { in: Object.values(SEED_ACCOUNTS) } } })

  // ── VERDE ──────────────────────────────────────────────────────────────────────
  const verde = await prisma.account.create({
    data: {
      name: "Cliente Verde (test)",
      accountnumber: SEED_ACCOUNTS.verde,
      cr_bex_glpientityid: "9001",
      cr_bex_estadocliente: "Activo",
      industrycode: "Tecnología",
      cr_bex_niveladopcion: "Alto",
      cr_bex_horascontratadas: 100,
      cr_bex_horasconsumidas: 10,
      relationships: {
        create: [
          {
            cr_bex_rolbext: "Ejecutivo Comercial",
            cr_bex_nombrepersona: "Ana BEXT",
            cr_bex_frecuenciacontacto: "Mensual",
            cr_bex_ultimareunion: subDays(new Date(), 10),
            cr_bex_proximareunion: subDays(new Date(), -20),
          },
        ],
      },
    },
  })
  // Tendencia estable (2/mes x 6 meses), CSAT alto.
  const verdeFacts = [0, 1, 2, 3, 4, 5].flatMap((m) =>
    ticketsEnMes(verde.id, m, 2, 1000 + m * 10, { satisfaction: 5, actiontimeHours: 1 }),
  )
  await prisma.glpiTicketFact.createMany({ data: verdeFacts })

  // ── ROJO ─────────────────────────────────────────────────────────────────────
  const rojo = await prisma.account.create({
    data: {
      name: "Cliente Rojo (test)",
      accountnumber: SEED_ACCOUNTS.rojo,
      cr_bex_glpientityid: "9002",
      cr_bex_estadocliente: "En riesgo",
      industrycode: "Gobierno",
      cr_bex_niveladopcion: "Bajo",
      cr_bex_horascontratadas: 100,
      cr_bex_horasconsumidas: 95,
      relationships: {
        create: [
          {
            cr_bex_rolbext: "Gerente de Proyecto",
            cr_bex_nombrepersona: "Luis BEXT",
            cr_bex_ultimareunion: subDays(new Date(), 120), // >60 → sin contacto
          },
        ],
      },
      products: {
        create: [
          {
            title: "Cliente Rojo (test)",
            cr_bex_productoservicio: "Soporte Managed Services",
            statecode: "Activo",
            expireson: subDays(new Date(), -15), // renueva en ~15 días (≤30)
          },
        ],
      },
      deliverables: {
        create: [
          {
            nombre: "Informe de gestión de mesa",
            frecuencia: "Mensual",
            responsable: "Ana CSM",
            proximaEntrega: subDays(new Date(), 3), // vencido hace 3 días
            notificarDiasAntes: 5,
          },
        ],
      },
    },
  })
  // Tendencia al alza: meses -5..-3 = 1 c/u; meses -2..0 = 3,3,4. CSAT bajo. Horas para burn-rate.
  const rojoFacts = [
    ...ticketsEnMes(rojo.id, 5, 1, 2000, { satisfaction: 1, actiontimeHours: 3, isLate: true }),
    ...ticketsEnMes(rojo.id, 4, 1, 2010, { satisfaction: 1, actiontimeHours: 3 }),
    ...ticketsEnMes(rojo.id, 3, 1, 2020, { satisfaction: 1, actiontimeHours: 3 }),
    ...ticketsEnMes(rojo.id, 2, 3, 2030, { satisfaction: 1, actiontimeHours: 3, isLate: true }),
    ...ticketsEnMes(rojo.id, 1, 3, 2040, { satisfaction: 1, actiontimeHours: 3 }),
    ...ticketsEnMes(rojo.id, 0, 4, 2050, { satisfaction: 1, actiontimeHours: 3, isLate: true }),
  ]
  await prisma.glpiTicketFact.createMany({ data: rojoFacts })

  // ── GRIS (sin señal) ──────────────────────────────────────────────────────────
  const gris = await prisma.account.create({
    data: {
      name: "Cliente Gris (test)",
      accountnumber: SEED_ACCOUNTS.gris,
      cr_bex_glpientityid: "9003",
      cr_bex_estadocliente: "Activo",
      // Sin adopción, sin horas, sin relaciones, sin CSAT en tickets.
    },
  })
  // Tickets todos en el MISMO día (mitad de mes) → un solo mes → tendencia null.
  // (Usar un día fijo evita que cerca del cambio de mes se repartan en 2 meses y
  // aparezca señal de tendencia, lo que sacaría al cliente del estado "gris".)
  const midMonth = new Date()
  midMonth.setDate(15)
  const grisFacts = Array.from({ length: 4 }, (_, i) =>
    fact(gris.id, { glpiTicketId: 3000 + i, openedAt: midMonth, satisfaction: null, actiontimeHours: 1 }),
  )
  await prisma.glpiTicketFact.createMany({ data: grisFacts })

  return { verde: verde.id, rojo: rojo.id, gris: gris.id }
}
