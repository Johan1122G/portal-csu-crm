-- CreateTable
CREATE TABLE "ticket_embeddings" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "glpiTicketId" INTEGER NOT NULL,
    "vector" TEXT NOT NULL,
    "dim" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_embeddings_accountId_idx" ON "ticket_embeddings"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_embeddings_accountId_glpiTicketId_key" ON "ticket_embeddings"("accountId", "glpiTicketId");

-- AddForeignKey
ALTER TABLE "ticket_embeddings" ADD CONSTRAINT "ticket_embeddings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
