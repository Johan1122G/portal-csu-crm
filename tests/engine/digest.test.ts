import { describe, it, expect, beforeAll } from "vitest"
import { resetAndSeed } from "../fixtures/seed"
import { computeDigest } from "@/lib/analytics/digest"

const nombres = (rows: { name: string }[]) => rows.map((r) => r.name)

let digest: Awaited<ReturnType<typeof computeDigest>>

beforeAll(async () => {
  await resetAndSeed()
  digest = await computeDigest() // sin intro IA (no requiere credenciales)
})

describe("computeDigest — clasificación en cubos", () => {
  it("cuenta clientes sembrados y los sin datos de salud", () => {
    expect(digest.totalClientes).toBeGreaterThanOrEqual(3)
    expect(digest.sinDatosSalud).toBeGreaterThanOrEqual(1) // el GRIS
  })

  it("el cliente ROJO cae en enRojo, renovaciones, bolsas y sinContacto", () => {
    expect(nombres(digest.buckets.enRojo)).toContain("Cliente Rojo (test)")
    expect(nombres(digest.buckets.renovaciones)).toContain("Cliente Rojo (test)")
    expect(nombres(digest.buckets.bolsas)).toContain("Cliente Rojo (test)")
    expect(nombres(digest.buckets.sinContacto)).toContain("Cliente Rojo (test)")
  })

  it("el VERDE y el GRIS NO aparecen como en riesgo (rojo)", () => {
    expect(nombres(digest.buckets.enRojo)).not.toContain("Cliente Verde (test)")
    expect(nombres(digest.buckets.enRojo)).not.toContain("Cliente Gris (test)")
  })
})
