-- CreateEnum
CREATE TYPE "AccountingPeriodReopenRequestStatus" AS ENUM ('PENDING', 'REJECTED', 'CANCELLED', 'EXECUTED');

-- CreateTable
CREATE TABLE "AccountingPeriodReopenRequest" (
    "id" TEXT NOT NULL,
    "requestNo" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AccountingPeriodReopenRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "requestedByStaffId" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "requestedByRole" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedByStaffId" TEXT,
    "approvedByName" TEXT,
    "approvedByRole" TEXT,
    "approvalNote" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedByStaffId" TEXT,
    "rejectedByName" TEXT,
    "rejectedByRole" TEXT,
    "rejectionNote" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledByStaffId" TEXT,
    "cancelledByName" TEXT,
    "cancelledByRole" TEXT,
    "executedAt" TIMESTAMP(3),
    "reopenEvidenceId" TEXT,
    "closeEvidenceId" TEXT,
    "policyKey" TEXT NOT NULL DEFAULT 'default',
    "payloadVersion" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingPeriodReopenRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriodReopenRequest_requestNo_key" ON "AccountingPeriodReopenRequest"("requestNo");

-- CreateIndex
CREATE INDEX "AccountingPeriodReopenRequest_periodId_status_idx" ON "AccountingPeriodReopenRequest"("periodId", "status");

-- CreateIndex
CREATE INDEX "AccountingPeriodReopenRequest_periodId_requestedAt_idx" ON "AccountingPeriodReopenRequest"("periodId", "requestedAt" DESC);

-- CreateIndex
CREATE INDEX "AccountingPeriodReopenRequest_branchId_periodKey_idx" ON "AccountingPeriodReopenRequest"("branchId", "periodKey");

-- AddForeignKey
ALTER TABLE "AccountingPeriodReopenRequest" ADD CONSTRAINT "AccountingPeriodReopenRequest_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AccountingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
