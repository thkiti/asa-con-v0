-- MC-1D Step 3: LegalEntity Phase B — NOT NULL + entity-scoped period unique

-- DropForeignKey
ALTER TABLE "AccountingPeriod" DROP CONSTRAINT "AccountingPeriod_legalEntityCode_fkey";

-- DropForeignKey
ALTER TABLE "JournalEntry" DROP CONSTRAINT "JournalEntry_legalEntityCode_fkey";

-- DropForeignKey
ALTER TABLE "StockDocument" DROP CONSTRAINT "StockDocument_legalEntityCode_fkey";

-- DropForeignKey
ALTER TABLE "Voucher" DROP CONSTRAINT "Voucher_legalEntityCode_fkey";

-- DropIndex
DROP INDEX "AccountingPeriod_branchId_periodKey_key";

-- AlterTable
ALTER TABLE "AccountingPeriod" ALTER COLUMN "legalEntityCode" SET NOT NULL;

-- AlterTable
ALTER TABLE "JournalEntry" ALTER COLUMN "legalEntityCode" SET NOT NULL;

-- AlterTable
ALTER TABLE "StockDocument" ALTER COLUMN "legalEntityCode" SET NOT NULL;

-- AlterTable
ALTER TABLE "Voucher" ALTER COLUMN "legalEntityCode" SET NOT NULL;

-- CreateIndex
CREATE INDEX "AccountingPeriod_branchId_idx" ON "AccountingPeriod"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_legalEntityCode_periodKey_key" ON "AccountingPeriod"("legalEntityCode", "periodKey");

-- AddForeignKey
ALTER TABLE "StockDocument" ADD CONSTRAINT "StockDocument_legalEntityCode_fkey" FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_legalEntityCode_fkey" FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_legalEntityCode_fkey" FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_legalEntityCode_fkey" FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
