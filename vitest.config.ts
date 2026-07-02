import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"
import { config } from "dotenv"

// Carga .env.test para que el cliente Prisma apunte al schema "test" y la auth use
// el bypass de dev. Se pasa a los workers vía `test.env`.
const env = (config({ path: ".env.test" }).parsed ?? {}) as Record<string, string>

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    env,
    include: ["tests/unit/**/*.test.ts", "tests/engine/**/*.test.ts"],
    // Los tests de motores comparten el schema de la DB → serial para evitar que se
    // pisen entre sí al resetear/sembrar.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
