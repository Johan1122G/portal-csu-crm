-- Catálogos editables (listas desplegables administrables por el CSM).
CREATE TABLE "catalogs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedon" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "catalogs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalogs_key_idx" ON "catalogs"("key");

CREATE UNIQUE INDEX "catalogs_key_value_key" ON "catalogs"("key", "value");
