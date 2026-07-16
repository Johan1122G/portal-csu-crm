-- CreateTable
CREATE TABLE "deliverables" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "frecuencia" TEXT NOT NULL,
    "responsable" TEXT,
    "proximaEntrega" TIMESTAMP(3),
    "ultimaEntrega" TIMESTAMP(3),
    "notificarDiasAntes" INTEGER NOT NULL DEFAULT 5,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedon" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverable_logs" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "entregadoOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodo" TEXT,
    "entregadoPor" TEXT,
    "nota" TEXT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deliverable_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deliverables_accountId_idx" ON "deliverables"("accountId");

-- CreateIndex
CREATE INDEX "deliverable_logs_deliverableId_idx" ON "deliverable_logs"("deliverableId");

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverable_logs" ADD CONSTRAINT "deliverable_logs_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "deliverables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
