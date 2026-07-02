import { describe, it, expect, beforeAll } from "vitest"
import { resetAndSeed } from "../fixtures/seed"
import { computeClientAnalytics } from "@/lib/analytics/aggregate"

let ids: { verde: string; rojo: string; gris: string }

beforeAll(async () => {
  ids = await resetAndSeed()
})

describe("computeClientAnalytics", () => {
  it("VERDE: 12 tickets, CSAT 5, 100% categorizado", async () => {
    const a = await computeClientAnalytics(ids.verde)
    expect(a.resumen.totalTickets).toBe(12)
    expect(a.resumen.csatPromedio).toBe(5)
    expect(a.resumen.csatRespuestas).toBe(12)
    expect(a.resumen.categorizacionPct).toBe(100)
  })

  it("ROJO: 13 tickets, con incumplimiento de SLA y tendencia mensual", async () => {
    const a = await computeClientAnalytics(ids.rojo)
    expect(a.resumen.totalTickets).toBe(13)
    expect(a.resumen.slaIncumplidoPct).toBeGreaterThan(0)
    // tickets repartidos en varios meses
    expect(a.tendenciaMensual.length).toBeGreaterThanOrEqual(5)
  })

  it("GRIS: 4 tickets, sin CSAT", async () => {
    const a = await computeClientAnalytics(ids.gris)
    expect(a.resumen.totalTickets).toBe(4)
    expect(a.resumen.csatPromedio).toBeNull()
    expect(a.resumen.csatRespuestas).toBe(0)
  })
})
