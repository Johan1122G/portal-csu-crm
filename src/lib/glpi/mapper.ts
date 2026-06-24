import type { GlpiEntity } from "./client"

// GLPI devuelve nombres con entidades HTML (ej. "Caro &#38; Cuervo").
function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
}

const clean = (s?: string | null) => {
  const t = decodeEntities((s ?? "").trim())
  return t === "" ? undefined : t
}

// Solo son "clientes" las entidades que cuelgan de "Clientes Bext"
// (configurable por env). El resto son unidades internas de BEXT.
const CLIENTS_PARENT = process.env.GLPI_CLIENTS_PARENT?.trim() || "Clientes Bext"

export function isClientEntity(e: GlpiEntity): boolean {
  return (e.completename ?? "").includes(`${CLIENTS_PARENT} > `)
}

// NIT/accountnumber desde GLPI: usa registration_number; si está vacío, un
// placeholder estable basado en el id de entidad (evita colisión del unique).
export function accountNumberFor(entity: GlpiEntity): string {
  return clean(entity.registration_number) ?? `GLPI-${entity.id}`
}

// Datos para CREAR un Account a partir de una entidad GLPI.
export function mapEntityToAccountCreate(entity: GlpiEntity) {
  return {
    cr_bex_glpientityid: String(entity.id),
    name: clean(entity.name) ?? clean(entity.completename) ?? `Entidad ${entity.id}`,
    accountnumber: accountNumberFor(entity),
    websiteurl: clean(entity.website),
    address1_city: clean(entity.town),
    address1_country: clean(entity.country) ?? "Colombia",
    description: clean(entity.comment),
  }
}

// Datos para ACTUALIZAR un Account existente: solo los campos que provienen de
// GLPI. No tocamos estado, NIT ni campos de CS gestionados en el CRM. OJO:
// description (Observaciones) NO se actualiza a propósito — el CSM escribe notas
// ahí y un re-sync no debe pisarlas (solo se rellena al crear el cliente).
export function mapEntityToAccountUpdate(entity: GlpiEntity) {
  return {
    cr_bex_glpientityid: String(entity.id),
    name: clean(entity.name) ?? clean(entity.completename) ?? `Entidad ${entity.id}`,
    websiteurl: clean(entity.website),
    address1_city: clean(entity.town),
  }
}
