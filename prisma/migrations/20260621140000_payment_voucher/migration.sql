-- CreateEnum
CREATE TYPE "PaymentVoucherStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CONFIRMED', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PaymentVoucher" (
    "id" TEXT NOT NULL,
    "entryNo" TEXT NOT NULL,
    "status" "PaymentVoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "branchId" TEXT NOT NULL,
    "legalEntityCode" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "payFromAccountId" TEXT NOT NULL,
    "payeeName" TEXT NOT NULL,
    "refNo" TEXT,
    "chequeNo" TEXT,
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

    CONSTRAINT "PaymentVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentVoucherLine" (
    "id" TEXT NOT NULL,
    "paymentVoucherId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "glAccountId" TEXT NOT NULL,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "memo" TEXT,

    CONSTRAINT "PaymentVoucherLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentVoucher_entryNo_key" ON "PaymentVoucher"("entryNo");
CREATE UNIQUE INDEX "PaymentVoucher_postedVoucherId_key" ON "PaymentVoucher"("postedVoucherId");
CREATE UNIQUE INDEX "PaymentVoucher_postedJournalEntryId_key" ON "PaymentVoucher"("postedJournalEntryId");
CREATE INDEX "PaymentVoucher_branchId_entryDate_idx" ON "PaymentVoucher"("branchId", "entryDate");
CREATE INDEX "PaymentVoucher_legalEntityCode_entryDate_idx" ON "PaymentVoucher"("legalEntityCode", "entryDate");
CREATE INDEX "PaymentVoucher_legalEntityCode_status_idx" ON "PaymentVoucher"("legalEntityCode", "status");
CREATE INDEX "PaymentVoucher_status_entryDate_idx" ON "PaymentVoucher"("status", "entryDate");
CREATE UNIQUE INDEX "PaymentVoucherLine_paymentVoucherId_lineNo_key" ON "PaymentVoucherLine"("paymentVoucherId", "lineNo");
CREATE INDEX "PaymentVoucherLine_paymentVoucherId_idx" ON "PaymentVoucherLine"("paymentVoucherId");

-- AddForeignKey
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_legalEntityCode_fkey" FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_payFromAccountId_fkey" FOREIGN KEY ("payFromAccountId") REFERENCES "GlAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_postedVoucherId_fkey" FOREIGN KEY ("postedVoucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentVoucher" ADD CONSTRAINT "PaymentVoucher_postedJournalEntryId_fkey" FOREIGN KEY ("postedJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentVoucherLine" ADD CONSTRAINT "PaymentVoucherLine_paymentVoucherId_fkey" FOREIGN KEY ("paymentVoucherId") REFERENCES "PaymentVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentVoucherLine" ADD CONSTRAINT "PaymentVoucherLine_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "GlAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
