import type {
  Account,
  Contact,
  CSActivity,
  OpportunityRecommendation,
  ProductService,
} from "@prisma/client"
import type { AccountWithRelations } from "@/types"

// Las llaves de cada objeto son los NOMBRES LÓGICOS de Dataverse/D365 CS.
// Los lookups usan el formato del Data Import Wizard: `campo(entidad)` resuelto
// por el NOMBRE de la cuenta (Razón Social).

// Fecha → YYYY-MM-DD (formato que el wizard de D365 parsea sin ambigüedad).
const d = (date?: Date | null): string => (date ? new Date(date).toISOString().slice(0, 10) : "")
// Booleano custom → etiqueta del option set (Sí/No).
const b = (val: boolean): string => (val ? "Sí" : "No")
const s = (val?: string | number | null): string => (val == null ? "" : String(val))

// ─── account ─────────────────────────────────────────────────────────────────
export function mapAccountToD365(a: Account) {
  return {
    name: a.name,
    accountnumber: a.accountnumber,
    cr_bex_estadocliente: a.cr_bex_estadocliente,
    industrycode: s(a.industrycode),
    address1_city: s(a.address1_city),
    address1_country: a.address1_country,
    cr_bex_tamanoempresa: s(a.cr_bex_tamanoempresa),
    websiteurl: s(a.websiteurl),
    cr_bex_primernegocio: d(a.cr_bex_primernegocio),
    cr_bex_principalesretos: s(a.cr_bex_principalesretos),
    cr_bex_principalesdolores: s(a.cr_bex_principalesdolores),
    cr_bex_objetivosestrategicos: s(a.cr_bex_objetivosestrategicos),
    cr_bex_expectativasbext: s(a.cr_bex_expectativasbext),
    cr_bex_riesgosidentificados: s(a.cr_bex_riesgosidentificados),
    cr_bex_oportunidades: s(a.cr_bex_oportunidades),
    cr_bex_tienebolsahoras: b(a.cr_bex_tienebolsahoras),
    cr_bex_horascontratadas: s(a.cr_bex_horascontratadas),
    cr_bex_horasconsumidas: s(a.cr_bex_horasconsumidas),
    cr_bex_nivelsatisfaccion: s(a.cr_bex_nivelsatisfaccion),
    cr_bex_principalessolicitudes: s(a.cr_bex_principalessolicitudes),
    cr_bex_niveladopcion: s(a.cr_bex_niveladopcion),
    cr_bex_clienteestrategico: b(a.cr_bex_clienteestrategico),
    cr_bex_casoexito: b(a.cr_bex_casoexito),
    cr_bex_potencialcrecimiento: s(a.cr_bex_potencialcrecimiento),
    cr_bex_acompanamientoprioritario: b(a.cr_bex_acompanamientoprioritario),
    cr_bex_comentarioscs: s(a.cr_bex_comentarioscs),
    description: s(a.description),
  }
}

// ─── contact ───────────────────────────────────────────────────────────────────
export function mapContactToD365(c: Contact, accountName: string) {
  return {
    fullname: c.fullname,
    jobtitle: s(c.jobtitle),
    telephone1: s(c.telephone1),
    emailaddress1: c.emailaddress1,
    cr_bex_tipocontacto: c.cr_bex_tipocontacto,
    "parentcustomerid(account)": accountName,
  }
}

// ─── activitypointer ────────────────────────────────────────────────────────────
export function mapActivityToD365(act: CSActivity, accountName: string) {
  return {
    subject: s(act.subject),
    scheduledstart: d(act.scheduledstart),
    cr_bex_tipogestion: act.cr_bex_tipogestion,
    cr_bex_responsablecs: s(act.cr_bex_responsablecs),
    cr_bex_contactocliente: s(act.cr_bex_contactocliente),
    cr_bex_canal: s(act.cr_bex_canal),
    description: s(act.description),
    cr_bex_oportunidad: s(act.cr_bex_oportunidad),
    cr_bex_areaescalar: s(act.cr_bex_areaescalar),
    statecode: act.statecode,
    "regardingobjectid(account)": accountName,
  }
}

// ─── opportunity ─────────────────────────────────────────────────────────────────
export function mapOpportunityToD365(o: OpportunityRecommendation, accountName: string) {
  return {
    name: o.name,
    createdon: d(o.createdon),
    cr_bex_origen: o.cr_bex_origen,
    cr_bex_tipo: s(o.cr_bex_tipo),
    cr_bex_impacto: s(o.cr_bex_impacto),
    prioritycode: s(o.prioritycode),
    cr_bex_responsable: s(o.cr_bex_responsable),
    cr_bex_accionrequerida: s(o.cr_bex_accionrequerida),
    estimatedclosedate: d(o.estimatedclosedate),
    statecode: o.statecode,
    "customerid(account)": accountName,
  }
}

// ─── contract (producto/servicio) ────────────────────────────────────────────────
export function mapContractToD365(p: ProductService, accountName: string) {
  return {
    title: p.cr_bex_productoservicio || p.title,
    cr_bex_lineanegocio: s(p.cr_bex_lineanegocio),
    statecode: p.statecode,
    activeon: d(p.activeon),
    expireson: d(p.expireson),
    cr_bex_responsablebext: s(p.cr_bex_responsablebext),
    cr_bex_observaciones: s(p.cr_bex_observaciones),
    "customerid(account)": accountName,
  }
}

// Aplana un set de cuentas (con relaciones) a filas por entidad D365.
export function flattenAccountsToD365(accounts: AccountWithRelations[]) {
  return {
    accounts: accounts.map(mapAccountToD365),
    contacts: accounts.flatMap((a) => a.contacts.map((c) => mapContactToD365(c, a.name))),
    activities: accounts.flatMap((a) => a.activities.map((x) => mapActivityToD365(x, a.name))),
    opportunities: accounts.flatMap((a) => a.opportunities.map((o) => mapOpportunityToD365(o, a.name))),
    contracts: accounts.flatMap((a) => a.products.map((p) => mapContractToD365(p, a.name))),
  }
}
