-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('OPB', 'MJV', 'PAY', 'PAV', 'REV', 'PCV', 'CNT', 'ADJ', 'ORD', 'DEY', 'ORS', 'ORI', 'REC', 'REF', 'COL', 'READ_X', 'READ_Z');

-- CreateEnum
CREATE TYPE "DocumentArchiveKind" AS ENUM ('DOCUMENT_PDF', 'BANK_PAY_IN_SLIP', 'RECEIPT_SLIP', 'REFUND_SLIP', 'READ_REPORT');

-- CreateEnum
CREATE TYPE "GlAccountReconciliationRole" AS ENUM ('NONE', 'BANK', 'CASH');

-- CreateEnum
CREATE TYPE "PeriodReconciliationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CONFIRMED', 'LOCKED');

-- AlterEnum
BEGIN;
CREATE TYPE "DocumentArchiveStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'FAILED', 'SUPERSEDED', 'VOID');
ALTER TABLE "public"."DocumentArchive" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "DocumentArchive" ALTER COLUMN "status" TYPE "DocumentArchiveStatus_new" USING ("status"::text::"DocumentArchiveStatus_new");
ALTER TYPE "DocumentArchiveStatus" RENAME TO "DocumentArchiveStatus_old";
ALTER TYPE "DocumentArchiveStatus_new" RENAME TO "DocumentArchiveStatus";
DROP TYPE "public"."DocumentArchiveStatus_old";
ALTER TABLE "DocumentArchive" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropIndex
DROP INDEX "DocumentArchive_branchId_documentType_createdAt_idx";

-- DropIndex
DROP INDEX "DocumentArchive_documentType_documentNo_idx";

-- DropIndex
DROP INDEX "ManualJournalEntry_entryNo_key";

-- AlterTable
ALTER TABLE "DocumentArchive" DROP COLUMN "legalEntityId",
ADD COLUMN     "archiveKind" "DocumentArchiveKind" NOT NULL DEFAULT 'DOCUMENT_PDF',
ADD COLUMN     "archiveNo" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedByStaffId" TEXT,
ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "legalEntityCode" TEXT,
ADD COLUMN     "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
ADD COLUMN     "referenceNo" TEXT,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "storagePath" TEXT,
ADD COLUMN     "storageUrl" TEXT,
ALTER COLUMN "documentType" DROP NOT NULL,
ALTER COLUMN "documentId" DROP NOT NULL,
ALTER COLUMN "documentNo" DROP NOT NULL,
ALTER COLUMN "snapshotVersion" DROP NOT NULL;

-- AlterTable
ALTER TABLE "GlAccount" ADD COLUMN     "reconciliationRole" "GlAccountReconciliationRole" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "DocumentArchiveLink" (
    "id" TEXT NOT NULL,
    "archiveId" TEXT NOT NULL,
    "documentKind" "DocumentKind" NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentNo" TEXT NOT NULL,
    "linkType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentArchiveLink_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "DocumentArchiveLink_archiveId_idx" ON "DocumentArchiveLink"("archiveId");

-- CreateIndex
CREATE INDEX "DocumentArchiveLink_documentKind_documentId_idx" ON "DocumentArchiveLink"("documentKind", "documentId");

-- CreateIndex
CREATE INDEX "DocumentArchiveLink_documentKind_documentNo_idx" ON "DocumentArchiveLink"("documentKind", "documentNo");

-- CreateIndex
CREATE INDEX "BankReconciliation_legalEntityCode_periodKey_idx" ON "BankReconciliation"("legalEntityCode", "periodKey");

-- CreateIndex
CREATE INDEX "BankReconciliation_periodKey_idx" ON "BankReconciliation"("periodKey");

-- CreateIndex
CREATE INDEX "BankReconciliation_branchId_periodKey_idx" ON "BankReconciliation"("branchId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "BankReconciliation_legalEntityCode_periodKey_glAccountId_key" ON "BankReconciliation"("legalEntityCode", "periodKey", "glAccountId");

-- CreateIndex
CREATE INDEX "CashReconciliation_legalEntityCode_periodKey_idx" ON "CashReconciliation"("legalEntityCode", "periodKey");

-- CreateIndex
CREATE INDEX "CashReconciliation_periodKey_idx" ON "CashReconciliation"("periodKey");

-- CreateIndex
CREATE INDEX "CashReconciliation_branchId_periodKey_idx" ON "CashReconciliation"("branchId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "CashReconciliation_legalEntityCode_periodKey_branchId_glAcc_key" ON "CashReconciliation"("legalEntityCode", "periodKey", "branchId", "glAccountId");

-- CreateIndex
CREATE INDEX "DocumentArchive_legalEntityCode_archiveKind_archivedAt_idx" ON "DocumentArchive"("legalEntityCode", "archiveKind", "archivedAt");

-- CreateIndex
CREATE INDEX "DocumentArchive_branchId_archiveKind_createdAt_idx" ON "DocumentArchive"("branchId", "archiveKind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManualJournalEntry_legalEntityCode_entryNo_key" ON "ManualJournalEntry"("legalEntityCode", "entryNo");

-- AddForeignKey
ALTER TABLE "DocumentArchiveLink" ADD CONSTRAINT "DocumentArchiveLink_archiveId_fkey" FOREIGN KEY ("archiveId") REFERENCES "DocumentArchive"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
