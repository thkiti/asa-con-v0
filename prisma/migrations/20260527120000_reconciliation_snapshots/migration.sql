-- CreateEnum
CREATE TYPE "ReconciliationSnapshotKind" AS ENUM ('MANUAL');

-- CreateTable
CREATE TABLE "ReconciliationSnapshot" (
    "id" TEXT NOT NULL,
    "kind" "ReconciliationSnapshotKind" NOT NULL DEFAULT 'MANUAL',
    "branchId" TEXT,
    "fromDate" TIMESTAMP(3),
    "toDate" TIMESTAMP(3),
    "periodKey" TEXT,
    "label" TEXT,
    "note" TEXT,
    "checkedSales" INTEGER NOT NULL,
    "checkedStockDocuments" INTEGER NOT NULL,
    "issueCount" INTEGER NOT NULL,
    "dashboardRowCount" INTEGER NOT NULL,
    "matchedCount" INTEGER NOT NULL,
    "varianceCount" INTEGER NOT NULL,
    "totalVarianceAmount" DECIMAL(18,2) NOT NULL,
    "payloadVersion" INTEGER NOT NULL DEFAULT 1,
    "inventoryResult" JSONB NOT NULL,
    "salesResult" JSONB NOT NULL,
    "dashboardRows" JSONB NOT NULL,
    "issuesPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByStaffId" TEXT NOT NULL,

    CONSTRAINT "ReconciliationSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReconciliationSnapshot_branchId_createdAt_idx" ON "ReconciliationSnapshot"("branchId", "createdAt" DESC);
CREATE INDEX "ReconciliationSnapshot_createdAt_idx" ON "ReconciliationSnapshot"("createdAt" DESC);

ALTER TABLE "ReconciliationSnapshot" ADD CONSTRAINT "ReconciliationSnapshot_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReconciliationSnapshot" ADD CONSTRAINT "ReconciliationSnapshot_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
