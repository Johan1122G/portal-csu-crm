// ─── Capa de contexto del cliente (PORTABLE) ────────────────────────────────────
// La analítica necesita "contexto" del cliente (industria, adopción, expectativas,
// horas…) que hoy vive en el CRM (Postgres) y mañana vivirá en Dynamics 365.
//
// El motor de analítica (GLPI + agregación + IA) NUNCA lee la base directamente:
// solo depende de esta interfaz. Para migrar a D365 se implementa un
// D365ContextProvider y se cambia la factory — nada más del motor cambia.

import { prisma } from "@/lib/prisma"

// Forma neutral del contexto, independiente de la fuente (CRM o D365).
export type ClientContext = {
  id: string
  name: string
  accountnumber: string
  estado: string | null
  industria: string | null
  tamano: string | null
  estrategico: boolean
  nivelAdopcion: string | null
  potencialCrecimiento: string | null
  objetivos: string | null
  expectativas: string | null
  retos: string | null
  dolores: string | null
  riesgos: string | null
  horasContratadas: number | null
  horasConsumidas: number | null
  nivelSatisfaccion: number | null
  glpiEntityId: string | null
}

export type GlpiLinkedClient = { id: string; glpiEntityId: string }

export interface ClientContextProvider {
  // Contexto de un cliente para alimentar la analítica/IA.
  getContext(clientId: string): Promise<ClientContext | null>
  // Clientes vinculados a una entidad de GLPI (para el sync de la tabla de hechos).
  listGlpiLinkedClients(): Promise<GlpiLinkedClient[]>
}

// ─── Implementación actual: CRM en Postgres ──────────────────────────────────────
class CrmContextProvider implements ClientContextProvider {
  async getContext(clientId: string): Promise<ClientContext | null> {
    const a = await prisma.account.findUnique({ where: { id: clientId } })
    if (!a) return null
    return {
      id: a.id,
      name: a.name,
      accountnumber: a.accountnumber,
      estado: a.cr_bex_estadocliente,
      industria: a.industrycode,
      tamano: a.cr_bex_tamanoempresa,
      estrategico: a.cr_bex_clienteestrategico,
      nivelAdopcion: a.cr_bex_niveladopcion,
      potencialCrecimiento: a.cr_bex_potencialcrecimiento,
      objetivos: a.cr_bex_objetivosestrategicos,
      expectativas: a.cr_bex_expectativasbext,
      retos: a.cr_bex_principalesretos,
      dolores: a.cr_bex_principalesdolores,
      riesgos: a.cr_bex_riesgosidentificados,
      horasContratadas: a.cr_bex_horascontratadas,
      horasConsumidas: a.cr_bex_horasconsumidas,
      nivelSatisfaccion: a.cr_bex_nivelsatisfaccion,
      glpiEntityId: a.cr_bex_glpientityid,
    }
  }

  async listGlpiLinkedClients(): Promise<GlpiLinkedClient[]> {
    const rows = await prisma.account.findMany({
      where: { cr_bex_glpientityid: { not: null } },
      select: { id: true, cr_bex_glpientityid: true },
    })
    return rows.map((r) => ({ id: r.id, glpiEntityId: r.cr_bex_glpientityid! }))
  }
}

// Factory: hoy CRM; mañana se conmuta por env (ej. ANALYTICS_CONTEXT_SOURCE=d365).
let provider: ClientContextProvider | null = null

export function getContextProvider(): ClientContextProvider {
  if (provider) return provider
  // switch (process.env.ANALYTICS_CONTEXT_SOURCE) {
  //   case "d365": provider = new D365ContextProvider(); break
  //   default: provider = new CrmContextProvider()
  // }
  provider = new CrmContextProvider()
  return provider
}
