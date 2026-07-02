import { describe, it, expect, beforeAll } from "vitest"
import { resetAndSeed } from "../fixtures/seed"
import { computeClientAnalytics } from "@/lib/analytics/aggregate"
import { computeClientHealth } from "@/lib/analytics/health"
import { getContextProvider } from "@/lib/analytics/context"

let ids: { verde: string; rojo: string; gris: string }

async function salud(id: string) {
  const ctx = await getContextProvider().getContext(id)
  const analytics = await computeClientAnalytics(id)
  return computeClientHealth(id, analytics, ctx!)
}

beforeAll(async () => {
  ids = await resetAndSeed()
})

describe("computeClientHealth", () => {
  it("cliente con buenas señales → verde y score alto", async () => {
    const h = await salud(ids.verde)
    expect(h.color).toBe("verde")
    expect(h.score).not.toBeNull()
    expect(h.score!).toBeGreaterThanOrEqual(70)
  })

  it("cliente con malas señales → rojo, con bolsa/renovación/sin-contacto", async () => {
    const h = await salud(ids.rojo)
    expect(h.color).toBe("rojo")
    expect(h.score!).toBeLessThan(40)
    expect(h.bolsa.pct).toBe(95)
    expect(h.bolsa.semanasParaAgotar).not.toBeNull()
    expect(h.bolsa.semanasParaAgotar!).toBeLessThanOrEqual(6)
    expect(h.renovaciones.length).toBeGreaterThanOrEqual(1)
    expect(h.engagement.diasSinContacto).not.toBeNull()
    expect(h.engagement.diasSinContacto!).toBeGreaterThan(60)
  })

  it("cliente con tickets pero SIN señal de contexto → gris (score null), NO rojo", async () => {
    const h = await salud(ids.gris)
    expect(h.color).toBe("gris")
    expect(h.score).toBeNull()
  })
})
