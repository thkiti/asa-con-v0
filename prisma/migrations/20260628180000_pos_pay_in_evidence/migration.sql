-- CreateTable
CREATE TABLE IF NOT EXISTS "PosPayInEvidence" (
    "id" TEXT NOT NULL,
    "collectorReportId" TEXT NOT NULL,
    "collectNo" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "status" "PaymentEvidenceStatus" NOT NULL DEFAULT 'PENDING',
    "blobPathname" TEXT,
    "blobUrl" TEXT,
    "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "byteSize" INTEGER,
    "originalFilename" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "uploadedByStaffId" TEXT,
    "bankDepositDate" TIMESTAMP(3),
    "bankAccountCode" TEXT NOT NULL DEFAULT '1021',
    "bankDepositVoucherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosPayInEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PosPayInEvidence_collectorReportId_key" ON "PosPayInEvidence"("collectorReportId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PosPayInEvidence_branchId_status_idx" ON "PosPayInEvidence"("branchId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PosPayInEvidence_collectNo_idx" ON "PosPayInEvidence"("collectNo");

-- AddForeignKey
ALTER TABLE "PosPayInEvidence"
DROP CONSTRAINT IF EXISTS "PosPayInEvidence_collectorReportId_fkey";

ALTER TABLE "PosPayInEvidence"
ADD CONSTRAINT "PosPayInEvidence_collectorReportId_fkey"
FOREIGN KEY ("collectorReportId") REFERENCES "CollectorReport"("id")
ON DELETE CASCADE ON UPDATE CASCADE;