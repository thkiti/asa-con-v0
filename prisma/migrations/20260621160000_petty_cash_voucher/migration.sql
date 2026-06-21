-- CreateEnum
CREATE TYPE "PettyCashVoucherStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CONFIRMED', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PettyCashVoucher" (
    "id" TEXT NOT NULL,
    "entryNo" TEXT NOT NULL,
    "status" "PettyCashVoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "branchId" TEXT NOT NULL,
    "legalEntityCode" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "pettyCashAccountId" TEXT NOT NULL,
    "payeeName" TEXT NOT NULL,
    "refNo" TEXT,
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

    CONSTRAINT "PettyCashVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PettyCashVoucherLine" (
    "id" TEXT NOT NULL,
    "pettyCashVoucherId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "glAccountId" TEXT NOT NULL,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "memo" TEXT,

    CONSTRAINT "PettyCashVoucherLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PettyCashVoucher_entryNo_key" ON "PettyCashVoucher"("entryNo");
CREATE UNIQUE INDEX "PettyCashVoucher_postedVoucherId_key" ON "PettyCashVoucher"("postedVoucherId");
CREATE UNIQUE INDEX "PettyCashVoucher_postedJournalEntryId_key" ON "PettyCashVoucher"("postedJournalEntryId");
CREATE INDEX "PettyCashVoucher_branchId_entryDate_idx" ON "PettyCashVoucher"("branchId", "entryDate");
CREATE INDEX "PettyCashVoucher_legalEntityCode_entryDate_idx" ON "PettyCashVoucher"("legalEntityCode", "entryDate");
CREATE INDEX "PettyCashVoucher_legalEntityCode_status_idx" ON "PettyCashVoucher"("legalEntityCode", "status");
CREATE INDEX "PettyCashVoucher_status_entryDate_idx" ON "PettyCashVoucher"("status", "entryDate");
CREATE UNIQUE INDEX "PettyCashVoucherLine_pettyCashVoucherId_lineNo_key" ON "PettyCashVoucherLine"("pettyCashVoucherId", "lineNo");
CREATE INDEX "PettyCashVoucherLine_pettyCashVoucherId_idx" ON "PettyCashVoucherLine"("pettyCashVoucherId");

-- AddForeignKey
ALTER TABLE "PettyCashVoucher" ADD CONSTRAINT "PettyCashVoucher_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PettyCashVoucher" ADD CONSTRAINT "PettyCashVoucher_legalEntityCode_fkey" FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PettyCashVoucher" ADD CONSTRAINT "PettyCashVoucher_pettyCashAccountId_fkey" FOREIGN KEY ("pettyCashAccountId") REFERENCES "GlAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PettyCashVoucher" ADD CONSTRAINT "PettyCashVoucher_postedVoucherId_fkey" FOREIGN KEY ("postedVoucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PettyCashVoucher" ADD CONSTRAINT "PettyCashVoucher_postedJournalEntryId_fkey" FOREIGN KEY ("postedJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PettyCashVoucherLine" ADD CONSTRAINT "PettyCashVoucherLine_pettyCashVoucherId_fkey" FOREIGN KEY ("pettyCashVoucherId") REFERENCES "PettyCashVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PettyCashVoucherLine" ADD CONSTRAINT "PettyCashVoucherLine_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "GlAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
