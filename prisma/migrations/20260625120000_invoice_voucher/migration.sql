-- CreateEnum
CREATE TYPE "InvoiceVoucherStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CONFIRMED', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "InvoiceVoucher" (
    "id" TEXT NOT NULL,
    "entryNo" TEXT NOT NULL,
    "status" "InvoiceVoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "branchId" TEXT NOT NULL,
    "legalEntityCode" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "customerName" TEXT NOT NULL,
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

    CONSTRAINT "InvoiceVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceVoucherLine" (
    "id" TEXT NOT NULL,
    "invoiceVoucherId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "glAccountId" TEXT NOT NULL,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "memo" TEXT,

    CONSTRAINT "InvoiceVoucherLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceVoucher_entryNo_key" ON "InvoiceVoucher"("entryNo");
CREATE UNIQUE INDEX "InvoiceVoucher_postedVoucherId_key" ON "InvoiceVoucher"("postedVoucherId");
CREATE UNIQUE INDEX "InvoiceVoucher_postedJournalEntryId_key" ON "InvoiceVoucher"("postedJournalEntryId");
CREATE INDEX "InvoiceVoucher_branchId_invoiceDate_idx" ON "InvoiceVoucher"("branchId", "invoiceDate");
CREATE INDEX "InvoiceVoucher_legalEntityCode_invoiceDate_idx" ON "InvoiceVoucher"("legalEntityCode", "invoiceDate");
CREATE INDEX "InvoiceVoucher_legalEntityCode_status_idx" ON "InvoiceVoucher"("legalEntityCode", "status");
CREATE INDEX "InvoiceVoucher_status_invoiceDate_idx" ON "InvoiceVoucher"("status", "invoiceDate");
CREATE UNIQUE INDEX "InvoiceVoucherLine_invoiceVoucherId_lineNo_key" ON "InvoiceVoucherLine"("invoiceVoucherId", "lineNo");
CREATE INDEX "InvoiceVoucherLine_invoiceVoucherId_idx" ON "InvoiceVoucherLine"("invoiceVoucherId");

-- AddForeignKey
ALTER TABLE "InvoiceVoucher" ADD CONSTRAINT "InvoiceVoucher_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceVoucher" ADD CONSTRAINT "InvoiceVoucher_legalEntityCode_fkey" FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceVoucher" ADD CONSTRAINT "InvoiceVoucher_postedVoucherId_fkey" FOREIGN KEY ("postedVoucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvoiceVoucher" ADD CONSTRAINT "InvoiceVoucher_postedJournalEntryId_fkey" FOREIGN KEY ("postedJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InvoiceVoucherLine" ADD CONSTRAINT "InvoiceVoucherLine_invoiceVoucherId_fkey" FOREIGN KEY ("invoiceVoucherId") REFERENCES "InvoiceVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceVoucherLine" ADD CONSTRAINT "InvoiceVoucherLine_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "GlAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
