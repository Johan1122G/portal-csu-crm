import { test, expect, type Page } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

const ids = JSON.parse(
  fs.readFileSync(path.join("tests", "e2e", ".auth", "seed-ids.json"), "utf8"),
) as { verde: string; rojo: string; gris: string }

// Falla si aparece el overlay de error de Next (Server Error / runtime) — justo el
// tipo de fallo que rompió la ficha del cliente.
async function expectNoAppError(page: Page) {
  await expect(page.getByText("Unhandled Runtime Error")).toHaveCount(0)
  await expect(page.getByText("Server Error", { exact: false })).toHaveCount(0)
}

test("dashboard carga autenticado (no redirige a login)", async ({ page }) => {
  await page.goto("/")
  await expect(page).not.toHaveURL(/login/)
  await expectNoAppError(page)
})

test("la lista de clientes muestra los clientes sembrados", async ({ page }) => {
  await page.goto("/clientes")
  await expect(page.getByText("Cliente Rojo (test)")).toBeVisible()
  await expect(page.getByText("Cliente Verde (test)")).toBeVisible()
  await expectNoAppError(page)
})

test("la ficha 360 abre cada tab sin error", async ({ page }) => {
  await page.goto(`/clientes/${ids.rojo}`)
  await expect(page.getByText("Cliente Rojo (test)").first()).toBeVisible()

  const tabs = [
    "Información General",
    "Contactos",
    "Relacionamiento",
    "Conocimiento",
    "Soporte / CS",
    "Productos",
    "Gestiones CS",
    "Oportunidades",
    "Plan / Tareas",
    "Insights (IA)",
  ]
  for (const name of tabs) {
    await page.getByRole("tab", { name: new RegExp(name.replace(/[()/]/g, ".")) }).click()
    await expectNoAppError(page)
  }
})

test("Plan / Tareas: crear una tarea manual la muestra en la lista", async ({ page }) => {
  await page.goto(`/clientes/${ids.rojo}`)
  await page.getByRole("tab", { name: /Plan . Tareas/ }).click()
  await expect(page.getByText("Aplicar un playbook")).toBeVisible()

  const titulo = "Tarea smoke E2E"
  await page.getByPlaceholder("Título de la tarea").fill(titulo)
  await page.getByRole("button", { name: "Agregar", exact: true }).click()
  await expect(page.getByText(titulo)).toBeVisible()
  await expectNoAppError(page)
})

test("Import masivo: sube un archivo y actualiza cliente + contacto + contrato", async ({ page }) => {
  await page.goto("/clientes/importar")
  await expect(page.getByText("Descarga la plantilla")).toBeVisible({ timeout: 45_000 })

  // CSV con datos de varios destinos para el cliente sembrado ROJO.
  const csv = [
    "Nombre Empresa,Sector,Contacto Principal,Correo,Ejecutivo Cuenta,Tipo de solución contratado,Fecha Fin",
    "Cliente Rojo (test),Gobierno,Ana Test,ana@test.com,Juan BEXT,Servicios,2027-01-01",
  ].join("\n")

  await page.setInputFiles('input[type="file"]', {
    name: "carga.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "utf8"),
  })
  await page.getByRole("button", { name: /Importar a todos los clientes/ }).click()

  await expect(page.getByText(/cliente\(s\) actualizado\(s\)/)).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/contacto\(s\)/)).toBeVisible()
  await expectNoAppError(page)
})

test("Digest: carga y ubica al cliente en riesgo", async ({ page }) => {
  await page.goto("/digest")
  await expect(page.getByText("En riesgo (rojo)")).toBeVisible()
  await expect(page.getByRole("link", { name: "Cliente Rojo (test)" }).first()).toBeVisible()
  await expectNoAppError(page)
})

test("QBR: la vista imprimible del cliente carga con su botón de impresión", async ({ page }) => {
  await page.goto(`/clientes/${ids.rojo}/qbr`)
  await expect(page.getByText("Quarterly Business Review")).toBeVisible()
  await expect(page.getByText("Cliente Rojo (test)")).toBeVisible()
  await expect(page.getByRole("button", { name: /Imprimir . Guardar PDF/ })).toBeVisible()
  await expectNoAppError(page)
})
