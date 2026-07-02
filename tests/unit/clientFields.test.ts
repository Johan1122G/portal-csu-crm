import { describe, it, expect } from "vitest"
import {
  CLIENT_IMPORT_FIELDS,
  FIELD_BY_CAMPO,
  coerceValue,
  esPlaceholder,
  formatForTemplate,
  PLACEHOLDER_VALOR,
} from "@/lib/import/clientFields"

const f = (campo: string) => FIELD_BY_CAMPO[campo]

describe("clientFields — integridad del catálogo", () => {
  it("no tiene campos duplicados", () => {
    const campos = CLIENT_IMPORT_FIELDS.map((x) => x.campo)
    expect(new Set(campos).size).toBe(campos.length)
  })
  it("todos tienen accountKey y etiqueta", () => {
    for (const x of CLIENT_IMPORT_FIELDS) {
      expect(x.accountKey).toBeTruthy()
      expect(x.etiqueta).toBeTruthy()
    }
  })
})

describe("esPlaceholder", () => {
  it("detecta vacío y el texto guía como placeholder", () => {
    expect(esPlaceholder("")).toBe(true)
    expect(esPlaceholder("   ")).toBe(true)
    expect(esPlaceholder(PLACEHOLDER_VALOR)).toBe(true)
    expect(esPlaceholder("edita esta celda")).toBe(true)
    expect(esPlaceholder(undefined)).toBe(true)
  })
  it("un valor real NO es placeholder", () => {
    expect(esPlaceholder("Activo")).toBe(false)
    expect(esPlaceholder("1000")).toBe(false)
  })
})

describe("coerceValue — coerción por tipo", () => {
  it("vacío → undefined (no sobreescribe)", () => {
    expect(coerceValue(f("industria"), "")).toBeUndefined()
    expect(coerceValue(f("horas_contratadas"), "  ")).toBeUndefined()
  })
  it("int válido e inválido", () => {
    expect(coerceValue(f("horas_contratadas"), "1000")).toBe(1000)
    expect(coerceValue(f("horas_contratadas"), "abc")).toBeUndefined()
  })
  it("boolean acepta variantes es/en", () => {
    expect(coerceValue(f("cliente_estrategico"), "Sí")).toBe(true)
    expect(coerceValue(f("cliente_estrategico"), "si")).toBe(true)
    expect(coerceValue(f("cliente_estrategico"), "No")).toBe(false)
    expect(coerceValue(f("cliente_estrategico"), "tal vez")).toBeUndefined()
  })
  it("date válida e inválida", () => {
    const d = coerceValue(f("fecha_primer_negocio"), "2021-03-15")
    expect(d).toBeInstanceOf(Date)
    expect((d as Date).getUTCFullYear()).toBe(2021)
    expect(coerceValue(f("fecha_primer_negocio"), "no-fecha")).toBeUndefined()
  })
})

describe("formatForTemplate", () => {
  it("boolean → Sí/No, null → vacío", () => {
    expect(formatForTemplate(f("cliente_estrategico"), true)).toBe("Sí")
    expect(formatForTemplate(f("cliente_estrategico"), false)).toBe("No")
    expect(formatForTemplate(f("industria"), null)).toBe("")
  })
  it("date → YYYY-MM-DD", () => {
    expect(formatForTemplate(f("fecha_primer_negocio"), new Date("2021-03-15T00:00:00Z"))).toBe("2021-03-15")
  })
})
