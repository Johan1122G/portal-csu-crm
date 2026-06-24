-- Add GLPI entity id for idempotent sync (nullable, unique).
ALTER TABLE "accounts" ADD COLUMN "cr_bex_glpientityid" TEXT;

CREATE UNIQUE INDEX "accounts_cr_bex_glpientityid_key" ON "accounts"("cr_bex_glpientityid");
