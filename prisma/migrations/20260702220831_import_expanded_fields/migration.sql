-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "cr_bex_csatmanual" DOUBLE PRECISION,
ADD COLUMN     "cr_bex_nps" INTEGER,
ADD COLUMN     "cr_bex_slacumplimiento" INTEGER,
ADD COLUMN     "cr_bex_ultimainteraccion" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "product_services" ADD COLUMN     "cr_bex_tipofacturacion" TEXT,
ADD COLUMN     "cr_bex_valorcontrato" DOUBLE PRECISION;
