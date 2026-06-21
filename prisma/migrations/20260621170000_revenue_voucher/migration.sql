-- CreateEnum
CREATE TYPE "RevenueVoucherStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CONFIRMED', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "RevenueVoucher" (
    "id" TEXT NOT NULL,
    "entryNo" TEXT NOT NULL,
    "status" "RevenueVoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "branchId" TEXT NOT NULL,
    "legalEntityCode" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "receiveToAccountId" TEXT NOT NULL,
    "receivedFromName" TEXT NOT NULL,
    "refNo" TEXT,
    "receiptNo" TEXT,
    "description" TEXT,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdByStaffId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "submittedByStaffId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedByStaffId" TEXT,
    "postedAt" TIMESTAMP(3),
    "postedByStaffId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledByStaffId" TEXT,
    "cancelReason" TEXT,
    "postedVoucherId" TEXT,
    "postedJournalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueVoucherLine" (
    "id" TEXT NOT NULL,
    "revenueVoucherId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "glAccountId" TEXT NOT NULL,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "memo" TEXT,

    CONSTRAINT "RevenueVoucherLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RevenueVoucher_entryNo_key" ON "RevenueVoucher"("entryNo");
CREATE UNIQUE INDEX "RevenueVoucher_postedVoucherId_key" ON "RevenueVoucher"("postedVoucherId");
CREATE UNIQUE INDEX "RevenueVoucher_postedJournalEntryId_key" ON "RevenueVoucher"("postedJournalEntryId");
CREATE INDEX "RevenueVoucher_branchId_entryDate_idx" ON "RevenueVoucher"("branchId", "entryDate");
CREATE INDEX "RevenueVoucher_legalEntityCode_entryDate_idx" ON "RevenueVoucher"("legalEntityCode", "entryDate");
CREATE INDEX "RevenueVoucher_legalEntityCode_status_idx" ON "RevenueVoucher"("legalEntityCode", "status");
CREATE INDEX "RevenueVoucher_status_entryDate_idx" ON "RevenueVoucher"("status", "entryDate");
CREATE UNIQUE INDEX "RevenueVoucherLine_revenueVoucherId_lineNo_key" ON "RevenueVoucherLine"("revenueVoucherId", "lineNo");
CREATE INDEX "RevenueVoucherLine_revenueVoucherId_idx" ON "RevenueVoucherLine"("revenueVoucherId");

-- AddForeignKey
ALTER TABLE "RevenueVoucher" ADD CONSTRAINT "RevenueVoucher_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RevenueVoucher" ADD CONSTRAINT "RevenueVoucher_legalEntityCode_fkey" FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RevenueVoucher" ADD CONSTRAINT "RevenueVoucher_receiveToAccountId_fkey" FOREIGN KEY ("receiveToAccountId") REFERENCES "GlAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RevenueVoucher" ADD CONSTRAINT "RevenueVoucher_postedVoucherId_fkey" FOREIGN KEY ("postedVoucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RevenueVoucher" ADD CONSTRAINT "RevenueVoucher_postedJournalEntryId_fkey" FOREIGN KEY ("postedJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RevenueVoucherLine" ADD CONSTRAINT "RevenueVoucherLine_revenueVoucherId_fkey" FOREIGN KEY ("revenueVoucherId") REFERENCES "RevenueVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevenueVoucherLine" ADD CONSTRAINT "RevenueVoucherLine_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "GlAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
