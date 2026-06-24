-- CreateTable
CREATE TABLE "teams_meetings" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "iCalUId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "organizer" TEXT,
    "organizerEmail" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "joinUrl" TEXT,
    "webLink" TEXT,
    "bextParticipants" TEXT,
    "clientParticipants" TEXT,
    "transcript" TEXT,
    "aiNotes" TEXT,
    "analisis" TEXT,
    "analizadoOn" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teams_meetings_accountId_idx" ON "teams_meetings"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_meetings_accountId_iCalUId_key" ON "teams_meetings"("accountId", "iCalUId");

-- AddForeignKey
ALTER TABLE "teams_meetings" ADD CONSTRAINT "teams_meetings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
