import { test, expect, type Page } from "@playwright/test"

// Falla si aparece el overlay de error de Next (Server Error / runtime).
async function expectNoAppError(page: Page) {
  await expect(page.getByText("Unhandled Runtime Error")).toHaveCount(0)
  await expect(page.getByText("Server Error", { exact: false })).toHaveCount(0)
}

test("Benchmark: carga y agrupa clientes en cohortes", async ({ page }) => {
  await page.goto("/benchmark")
  // timeout amplio: absorbe la compilación en frío del route + el cálculo.
  await expect(page.getByText("Cohortes (industrias)")).toBeVisible({ timeout: 45_000 })
  // Los clientes sembrados no tienen industria → cohorte "Sin industria".
  await expect(page.getByText("Sin industria")).toBeVisible()
  await expect(page.getByRole("link", { name: "Cliente Rojo (test)" }).first()).toBeVisible()
  await expectNoAppError(page)
})

test("Búsqueda semántica: carga y degrada a 'pendiente' sin modelo de embeddings", async ({ page }) => {
  await page.goto("/buscar")
  await expect(page.getByPlaceholder(/Busca por significado/)).toBeVisible({ timeout: 45_000 })
  // Dispara una búsqueda (preset). En test no hay AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT
  // → el endpoint responde configured:false → estado "pendiente de configurar".
  await page.getByRole("button", { name: "problemas de MFA o identidad" }).click()
  await expect(page.getByText("pendiente de configurar")).toBeVisible({ timeout: 20_000 })
  await expectNoAppError(page)
})

test("Riesgo de fuga: rankea clientes con factores", async ({ page }) => {
  await page.goto("/churn")
  await expect(page.getByText("Riesgo alto", { exact: true })).toBeVisible({ timeout: 45_000 })
  // El cliente ROJO tiene malas señales → aparece con riesgo/factores.
  await expect(page.getByRole("link", { name: "Cliente Rojo (test)" })).toBeVisible()
  await expectNoAppError(page)
})

test("Valor agregado: lista entregables globales (vencido sembrado)", async ({ page }) => {
  await page.goto("/valor-agregado")
  await expect(page.getByText("Vencidos")).toBeVisible({ timeout: 45_000 })
  await expect(page.getByText("Informe de gestión de mesa")).toBeVisible()
  await expect(page.getByRole("link", { name: "Cliente Rojo (test)" }).first()).toBeVisible()
  await expectNoAppError(page)
})

test("Proyección de capacidad: muestra series y bolsas", async ({ page }) => {
  await page.goto("/capacidad")
  await expect(page.getByText("Volumen de tickets / mes")).toBeVisible({ timeout: 45_000 })
  await expect(page.getByText("Consumo de horas / mes")).toBeVisible()
  await expect(page.getByText("Bolsas de horas — orden por urgencia")).toBeVisible()
  // El cliente ROJO tiene bolsa (95% consumida) → aparece en la tabla de bolsas.
  await expect(page.getByRole("link", { name: "Cliente Rojo (test)" }).first()).toBeVisible()
  await expectNoAppError(page)
})
