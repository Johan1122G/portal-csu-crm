-- CreateTable
CREATE TABLE "insight_threads" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "title" TEXT,
    "createdBy" TEXT,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedon" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insight_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insight_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_findings" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "evidencia" TEXT NOT NULL,
    "recomendacion" TEXT NOT NULL,
    "impacto" TEXT NOT NULL,
    "confianza" TEXT NOT NULL,
    "opportunityId" TEXT,
    "generatedBy" TEXT,
    "generatedon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insight_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "insight_threads_accountId_idx" ON "insight_threads"("accountId");

-- CreateIndex
CREATE INDEX "insight_messages_threadId_idx" ON "insight_messages"("threadId");

-- CreateIndex
CREATE INDEX "insight_findings_accountId_idx" ON "insight_findings"("accountId");

-- AddForeignKey
ALTER TABLE "insight_threads" ADD CONSTRAINT "insight_threads_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_messages" ADD CONSTRAINT "insight_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "insight_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_findings" ADD CONSTRAINT "insight_findings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
