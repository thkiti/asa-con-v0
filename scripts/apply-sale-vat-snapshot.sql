-- P1.25 Sale VAT snapshot + TaxPolicy (idempotent for Supabase SQL Editor)
-- Source: prisma/migrations/20260628120000_pos_sale_vat_snapshot/migration.sql
-- Run once on production when columns are missing. Safe to re-run for ADD COLUMN IF NOT EXISTS.

ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "netAmount" DECIMAL(18,2);
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "vatAmount" DECIMAL(18,2);
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "vatRateBps" INTEGER;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "taxCode" TEXT;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "outputVatAccountCode" TEXT;

CREATE TABLE IF NOT EXISTS "TaxPolicy" (
    "id" TEXT NOT NULL,
    "legalEntityCode" TEXT NOT NULL,
    "taxCode" TEXT NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "inclusive" BOOLEAN NOT NULL DEFAULT true,
    "outputVatAccountCode" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxPolicy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TaxPolicy_legalEntityCode_taxCode_isActive_idx"
  ON "TaxPolicy"("legalEntityCode", "taxCode", "isActive");
CREATE INDEX IF NOT EXISTS "TaxPolicy_legalEntityCode_taxCode_effectiveFrom_idx"
  ON "TaxPolicy"("legalEntityCode", "taxCode", "effectiveFrom");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TaxPolicy_legalEntityCode_fkey'
  ) THEN
    ALTER TABLE "TaxPolicy"
      ADD CONSTRAINT "TaxPolicy_legalEntityCode_fkey"
      FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
