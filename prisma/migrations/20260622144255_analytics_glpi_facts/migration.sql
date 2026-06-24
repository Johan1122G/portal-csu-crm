-- CreateTable
CREATE TABLE "glpi_ticket_facts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "glpiTicketId" INTEGER NOT NULL,
    "subject" TEXT,
    "category" TEXT,
    "status" INTEGER NOT NULL,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "resolutionHours" DOUBLE PRECISION,
    "actiontimeHours" DOUBLE PRECISION,
    "satisfaction" INTEGER,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "glpi_ticket_facts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "glpi_ticket_facts_accountId_idx" ON "glpi_ticket_facts"("accountId");

-- CreateIndex
CREATE INDEX "glpi_ticket_facts_category_idx" ON "glpi_ticket_facts"("category");

-- CreateIndex
CREATE UNIQUE INDEX "glpi_ticket_facts_accountId_glpiTicketId_key" ON "glpi_ticket_facts"("accountId", "glpiTicketId");

-- AddForeignKey
ALTER TABLE "glpi_ticket_facts" ADD CONSTRAINT "glpi_ticket_facts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
