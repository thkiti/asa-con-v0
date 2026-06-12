-- MC-1D Step 1: LegalEntity Phase A (nullable legalEntityCode, no backfill, branch period unique unchanged)

-- CreateTable
CREATE TABLE "LegalEntity" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "taxId" TEXT,

    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("code")
);

-- Seed
INSERT INTO "LegalEntity" ("code", "name", "address", "taxId")
VALUES ('AS', 'ASAS', NULL, NULL),
       ('AD', 'ASAD', NULL, NULL)
ON CONFLICT ("code") DO NOTHING;

-- AlterTable
ALTER TABLE "AccountingPeriod" ADD COLUMN "legalEntityCode" TEXT;

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN "legalEntityCode" TEXT;

-- AlterTable
ALTER TABLE "StockDocument" ADD COLUMN "legalEntityCode" TEXT;

-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN "legalEntityCode" TEXT;

-- CreateIndex
CREATE INDEX "JournalEntry_legalEntityCode_periodId_date_idx" ON "JournalEntry"("legalEntityCode", "periodId", "date");

-- CreateIndex
CREATE INDEX "JournalEntry_legalEntityCode_date_idx" ON "JournalEntry"("legalEntityCode", "date");

-- CreateIndex
CREATE INDEX "StockDocument_legalEntityCode_date_idx" ON "StockDocument"("legalEntityCode", "date");

-- CreateIndex
CREATE INDEX "StockDocument_legalEntityCode_docType_status_idx" ON "StockDocument"("legalEntityCode", "docType", "status");

-- CreateIndex
CREATE INDEX "Voucher_legalEntityCode_date_idx" ON "Voucher"("legalEntityCode", "date");

-- CreateIndex
CREATE INDEX "Voucher_legalEntityCode_branchId_date_idx" ON "Voucher"("legalEntityCode", "branchId", "date");

-- AddForeignKey
ALTER TABLE "StockDocument" ADD CONSTRAINT "StockDocument_legalEntityCode_fkey" FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_legalEntityCode_fkey" FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_legalEntityCode_fkey" FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_legalEntityCode_fkey" FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code") ON DELETE SET NULL ON UPDATE CASCADE;
