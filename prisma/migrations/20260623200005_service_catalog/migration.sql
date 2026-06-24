-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "serviceCatalogItemId" TEXT;

-- CreateTable
CREATE TABLE "service_catalog" (
    "id" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "linea" TEXT,
    "nombre" TEXT NOT NULL,
    "nombreCompleto" TEXT,
    "categoria" TEXT,
    "descripcion" TEXT,
    "componentes" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "service_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_catalog_unidad_nombre_key" ON "service_catalog"("unidad", "nombre");

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_serviceCatalogItemId_fkey" FOREIGN KEY ("serviceCatalogItemId") REFERENCES "service_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
