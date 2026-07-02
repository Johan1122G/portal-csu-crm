import { defineConfig, devices } from "@playwright/test"
import { config } from "dotenv"

// Carga .env.test ANTES de todo (el global-setup y el webServer heredan estas vars):
// schema "test" en la DB + bypass de dev para autenticar sin Azure AD.
config({ path: ".env.test" })

const PORT = 3100
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    storageState: "tests/e2e/.auth/state.json",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // El server de pruebas corre en 3100 (aparte de tu dev en 3000) con el schema
    // "test" y su propia carpeta de build (.next-test) para no chocar con .next.
    command: `next dev -p ${PORT}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_DIST_DIR: ".next-test" },
  },
})
