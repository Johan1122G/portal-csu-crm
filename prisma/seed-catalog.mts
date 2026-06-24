// Seed del catálogo de servicios BEXT (idempotente). Correr con:
//   npx tsx prisma/seed-catalog.mts   (con DATABASE_URL apuntando a la base destino)
import { PrismaClient } from "@prisma/client"
import { SERVICE_CATALOG_SEED } from "../src/lib/catalog/serviceCatalogSeed"

const prisma = new PrismaClient()

for (const s of SERVICE_CATALOG_SEED) {
  await prisma.serviceCatalogItem.upsert({
    where: { unidad_nombre: { unidad: s.unidad, nombre: s.nombre } },
    create: { ...s, activo: true },
    update: {
      linea: s.linea ?? null,
      nombreCompleto: s.nombreCompleto ?? null,
      categoria: s.categoria ?? null,
      descripcion: s.descripcion ?? null,
    },
  })
}

console.log("Catálogo sembrado:", await prisma.serviceCatalogItem.count(), "ítems")
await prisma.$disconnect()
