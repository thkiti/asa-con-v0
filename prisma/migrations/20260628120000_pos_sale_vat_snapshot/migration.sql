-- Sale VAT snapshot fields + effective-dated tax policy
ALTER TABLE "Sale" ADD COLUMN "netAmount" DECIMAL(18,2);
ALTER TABLE "Sale" ADD COLUMN "vatAmount" DECIMAL(18,2);
ALTER TABLE "Sale" ADD COLUMN "vatRateBps" INTEGER;
ALTER TABLE "Sale" ADD COLUMN "taxCode" TEXT;
ALTER TABLE "Sale" ADD COLUMN "outputVatAccountCode" TEXT;

CREATE TABLE "TaxPolicy" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxPolicy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaxPolicy_legalEntityCode_taxCode_isActive_idx" ON "TaxPolicy"("legalEntityCode", "taxCode", "isActive");
CREATE INDEX "TaxPolicy_legalEntityCode_taxCode_effectiveFrom_idx" ON "TaxPolicy"("legalEntityCode", "taxCode", "effectiveFrom");

ALTER TABLE "TaxPolicy" ADD CONSTRAINT "TaxPolicy_legalEntityCode_fkey" FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
