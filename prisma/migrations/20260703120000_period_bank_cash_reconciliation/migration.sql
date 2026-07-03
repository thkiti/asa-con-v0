-- CreateEnum
CREATE TYPE "PeriodReconciliationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CONFIRMED', 'LOCKED');

-- CreateTable
CREATE TABLE "BankReconciliation" (
    "id" TEXT NOT NULL,
    "legalEntityCode" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "branchId" TEXT,
    "glAccountId" TEXT NOT NULL,
    "glBalance" DECIMAL(18,2) NOT NULL,
    "bankStatementBalance" DECIMAL(18,2) NOT NULL,
    "outstandingDeposits" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "outstandingPayments" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "bankCharges" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "interest" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "adjustments" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "reconciledBalance" DECIMAL(18,2) NOT NULL,
    "variance" DECIMAL(18,2) NOT NULL,
    "note" TEXT,
    "evidenceNote" TEXT,
    "status" "PeriodReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "submittedByStaffId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedByStaffId" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByStaffId" TEXT NOT NULL,
    "updatedByStaffId" TEXT,

    CONSTRAINT "BankReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashReconciliation" (
    "id" TEXT NOT NULL,
    "legalEntityCode" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "glAccountId" TEXT NOT NULL,
    "expectedCash" DECIMAL(18,2) NOT NULL,
    "actualCountedCash" DECIMAL(18,2) NOT NULL,
    "variance" DECIMAL(18,2) NOT NULL,
    "note" TEXT,
    "evidenceNote" TEXT,
    "status" "PeriodReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "submittedByStaffId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedByStaffId" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByStaffId" TEXT NOT NULL,
    "updatedByStaffId" TEXT,

    CONSTRAINT "CashReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankReconciliation_legalEntityCode_periodKey_glAccountId_key" ON "BankReconciliation"("legalEntityCode", "periodKey", "glAccountId");

-- CreateIndex
CREATE INDEX "BankReconciliation_legalEntityCode_periodKey_idx" ON "BankReconciliation"("legalEntityCode", "periodKey");

-- CreateIndex
CREATE INDEX "BankReconciliation_periodKey_idx" ON "BankReconciliation"("periodKey");

-- CreateIndex
CREATE INDEX "BankReconciliation_branchId_periodKey_idx" ON "BankReconciliation"("branchId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "CashReconciliation_legalEntityCode_periodKey_branchId_glAccountId_key" ON "CashReconciliation"("legalEntityCode", "periodKey", "branchId", "glAccountId");

-- CreateIndex
CREATE INDEX "CashReconciliation_legalEntityCode_periodKey_idx" ON "CashReconciliation"("legalEntityCode", "periodKey");

-- CreateIndex
CREATE INDEX "CashReconciliation_periodKey_idx" ON "CashReconciliation"("periodKey");

-- CreateIndex
CREATE INDEX "CashReconciliation_branchId_periodKey_idx" ON "CashReconciliation"("branchId", "periodKey");

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_legalEntityCode_fkey" FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "GlAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashReconciliation" ADD CONSTRAINT "CashReconciliation_legalEntityCode_fkey" FOREIGN KEY ("legalEntityCode") REFERENCES "LegalEntity"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashReconciliation" ADD CONSTRAINT "CashReconciliation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashReconciliation" ADD CONSTRAINT "CashReconciliation_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "GlAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
