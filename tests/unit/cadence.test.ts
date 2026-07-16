import { describe, it, expect } from "vitest"
import { siguienteFecha, diasParaVencer, estadoEntrega } from "@/lib/deliverables/cadence"

const d = (s: string) => new Date(`${s}T12:00:00Z`)

describe("siguienteFecha — avance por frecuencia", () => {
  it("mensual/bimensual/trimestral/semestral/anual", () => {
    expect(siguienteFecha(d("2026-01-15"), "Mensual")?.toISOString().slice(0, 10)).toBe("2026-02-15")
    expect(siguienteFecha(d("2026-01-15"), "Bimensual")?.toISOString().slice(0, 10)).toBe("2026-03-15")
    expect(siguienteFecha(d("2026-01-15"), "Trimestral")?.toISOString().slice(0, 10)).toBe("2026-04-15")
    expect(siguienteFecha(d("2026-01-15"), "Semestral")?.toISOString().slice(0, 10)).toBe("2026-07-15")
    expect(siguienteFecha(d("2026-01-15"), "Anual")?.toISOString().slice(0, 10)).toBe("2027-01-15")
  })
  it("semanal/quincenal", () => {
    expect(siguienteFecha(d("2026-01-01"), "Semanal")?.toISOString().slice(0, 10)).toBe("2026-01-08")
    expect(siguienteFecha(d("2026-01-01"), "Quincenal")?.toISOString().slice(0, 10)).toBe("2026-01-16")
  })
  it("Única vez no se repite (null)", () => {
    expect(siguienteFecha(d("2026-01-15"), "Única vez")).toBeNull()
  })
})

describe("diasParaVencer / estadoEntrega", () => {
  const ahora = d("2026-07-10")
  it("clasifica vencido / próximo / al día / sin fecha / inactivo", () => {
    expect(estadoEntrega({ activo: true, proximaEntrega: d("2026-07-05"), notificarDiasAntes: 5, ahora })).toBe("vencido")
    expect(estadoEntrega({ activo: true, proximaEntrega: d("2026-07-13"), notificarDiasAntes: 5, ahora })).toBe("proximo")
    expect(estadoEntrega({ activo: true, proximaEntrega: d("2026-08-30"), notificarDiasAntes: 5, ahora })).toBe("alDia")
    expect(estadoEntrega({ activo: true, proximaEntrega: null, notificarDiasAntes: 5, ahora })).toBe("sinFecha")
    expect(estadoEntrega({ activo: false, proximaEntrega: d("2026-07-05"), notificarDiasAntes: 5, ahora })).toBe("inactivo")
  })
  it("diasParaVencer: negativo si venció", () => {
    expect(diasParaVencer(d("2026-07-05"), ahora)).toBeLessThan(0)
    expect(diasParaVencer(null, ahora)).toBeNull()
  })
})
