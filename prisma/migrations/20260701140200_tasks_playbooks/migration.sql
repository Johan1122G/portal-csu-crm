-- CreateTable
CREATE TABLE "playbook_runs" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "plantilla" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "motivo" TEXT,
    "createdBy" TEXT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedon" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playbook_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "playbookRunId" TEXT,
    "titulo" TEXT NOT NULL,
    "detalle" TEXT,
    "responsable" TEXT,
    "prioridad" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "vence" TIMESTAMP(3),
    "origen" TEXT NOT NULL DEFAULT 'Manual',
    "createdBy" TEXT,
    "completadaOn" TIMESTAMP(3),
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedon" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "playbook_runs_accountId_idx" ON "playbook_runs"("accountId");

-- CreateIndex
CREATE INDEX "tasks_accountId_idx" ON "tasks"("accountId");

-- CreateIndex
CREATE INDEX "tasks_playbookRunId_idx" ON "tasks"("playbookRunId");

-- AddForeignKey
ALTER TABLE "playbook_runs" ADD CONSTRAINT "playbook_runs_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_playbookRunId_fkey" FOREIGN KEY ("playbookRunId") REFERENCES "playbook_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
