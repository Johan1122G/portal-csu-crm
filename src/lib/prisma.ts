import { PrismaClient } from "@prisma/client"

// Singleton Prisma client — avoids exhausting the connection pool during
// Next.js hot-reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Bajo test (Vitest) silenciamos el log de queries para no inundar la salida.
const isTest = process.env.NODE_ENV === "test" || !!process.env.VITEST

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" || isTest ? ["error"] : ["query", "error", "warn"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
