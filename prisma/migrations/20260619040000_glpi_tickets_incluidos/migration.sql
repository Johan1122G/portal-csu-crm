-- Add JSON array of GLPI ticket ids that make up the current contract's consumed hours.
ALTER TABLE "accounts" ADD COLUMN "cr_bex_glpiticketsincluidos" TEXT;
