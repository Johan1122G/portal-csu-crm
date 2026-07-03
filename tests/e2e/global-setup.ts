import { chromium } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"
import { resetAndSeed } from "../fixtures/seed"

// Se ejecuta UNA vez antes de todos los tests E2E:
// 1) siembra el schema "test" con datos determinísticos
// 2) autentica con el bypass de dev y guarda la sesión (storageState) para reusar
// 3) guarda los ids sembrados para que los specs naveguen directo a la ficha.
const PORT = 3100
const baseURL = `http://localhost:${PORT}`
const authDir = path.join("tests", "e2e", ".auth")

export default async function globalSetup() {
  const ids = await resetAndSeed()

  fs.mkdirSync(authDir, { recursive: true })
  fs.writeFileSync(path.join(authDir, "seed-ids.json"), JSON.stringify(ids, null, 2))

  // Autentica por la API de next-auth (dev-bypass) dentro de un contexto de
  // navegador: es determinístico y no depende de la hidratación del botón. El
  // cookie de sesión queda en el contexto → se guarda en storageState.
  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL })

  // El server de test compila en frío la 1ª vez; reintenta hasta que /api/auth/csrf
  // responda (timeout amplio por request).
  let csrfToken = ""
  for (let intento = 1; intento <= 8 && !csrfToken; intento++) {
    try {
      const r = await context.request.get("/api/auth/csrf", { timeout: 60_000 })
      if (r.ok()) csrfToken = ((await r.json()) as { csrfToken: string }).csrfToken
    } catch {
      /* server aún compilando; reintenta */
    }
    if (!csrfToken) await new Promise((res) => setTimeout(res, 2000))
  }
  if (!csrfToken) throw new Error("El server de test no respondió /api/auth/csrf a tiempo.")

  await context.request.post("/api/auth/callback/dev-bypass", {
    form: { csrfToken, callbackUrl: `${baseURL}/` },
    timeout: 60_000,
  })
  const session = (await (await context.request.get("/api/auth/session", { timeout: 60_000 })).json()) as {
    user?: { email?: string }
  }
  if (!session?.user) throw new Error("El login dev-bypass no estableció sesión en el setup E2E.")

  await context.storageState({ path: path.join(authDir, "state.json") })
  await browser.close()
}
