import { describe, it, expect } from "vitest"
import { IMPORT_COLUMNS, resolveHeader, coerceCol, esPlaceholder } from "@/lib/import/bulk"

describe("IMPORT_COLUMNS — integridad", () => {
  it("no tiene encabezados duplicados", () => {
    const hs = IMPORT_COLUMNS.map((c) => c.header)
    expect(new Set(hs).size).toBe(hs.length)
  })
  it("tiene exactamente una columna de nombre y una de NIT", () => {
    expect(IMPORT_COLUMNS.filter((c) => c.target.kind === "matchName")).toHaveLength(1)
    expect(IMPORT_COLUMNS.filter((c) => c.target.kind === "matchNit")).toHaveLength(1)
  })
  it("incluye destinos contact, relationship y product (entidades relacionadas)", () => {
    const kinds = new Set(IMPORT_COLUMNS.map((c) => c.target.kind))
    expect(kinds.has("contact")).toBe(true)
    expect(kinds.has("relationship")).toBe(true)
    expect(kinds.has("product")).toBe(true)
  })
})

describe("resolveHeader — tolerante a acentos/espacios/alias", () => {
  it("resuelve el encabezado exacto del Excel de los CSM (con y sin acentos/espacios)", () => {
    expect(resolveHeader("Tipo de solucion contratado ")?.target).toMatchObject({ kind: "product", key: "cr_bex_lineanegocio" })
    expect(resolveHeader("Fecha Fin ")?.target).toMatchObject({ kind: "product", key: "expireson" })
    expect(resolveHeader("Tamaño")?.target).toMatchObject({ kind: "account", key: "cr_bex_tamanoempresa" })
  })
  it("acepta alias para el nombre del cliente", () => {
    expect(resolveHeader("Razón Social")?.target.kind).toBe("matchName")
    expect(resolveHeader("Nombre Empresa")?.target.kind).toBe("matchName")
  })
  it("devuelve null para columnas desconocidas", () => {
    expect(resolveHeader("Columna Inventada")).toBeNull()
  })
})

describe("coerceCol — coerción por tipo", () => {
  it("float tolera moneda y separadores de miles (es-CO)", () => {
    expect(coerceCol("float", "120000000")).toBe(120000000)
    expect(coerceCol("float", "$ 1.000.000,50")).toBe(1000000.5)
    expect(coerceCol("float", "4,5")).toBe(4.5)
  })
  it("int redondea y valida", () => {
    expect(coerceCol("int", "95")).toBe(95)
    expect(coerceCol("int", "abc")).toBeUndefined()
  })
  it("boolean Sí/No", () => {
    expect(coerceCol("boolean", "Sí")).toBe(true)
    expect(coerceCol("boolean", "No")).toBe(false)
  })
  it("date válida/ inválida y vacío", () => {
    expect(coerceCol("date", "2026-01-15")).toBeInstanceOf(Date)
    expect(coerceCol("date", "xx")).toBeUndefined()
    expect(coerceCol("text", "")).toBeUndefined()
  })
})

describe("esPlaceholder", () => {
  it("detecta vacío y texto guía", () => {
    expect(esPlaceholder("")).toBe(true)
    expect(esPlaceholder("✏️ Edita esta celda")).toBe(true)
    expect(esPlaceholder("Educación")).toBe(false)
  })
})
