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

  const csrf = (await (await context.request.get("/api/auth/csrf")).json()) as { csrfToken: string }
  await context.request.post("/api/auth/callback/dev-bypass", {
    form: { csrfToken: csrf.csrfToken, callbackUrl: `${baseURL}/` },
  })
  const session = (await (await context.request.get("/api/auth/session")).json()) as {
    user?: { email?: string }
  }
  if (!session?.user) throw new Error("El login dev-bypass no estableció sesión en el setup E2E.")

  await context.storageState({ path: path.join(authDir, "state.json") })
  await browser.close()
}
