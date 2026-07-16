-- AlterEnum
ALTER TYPE "RefundKind" ADD VALUE 'LEGACY_HISTORICAL';

-- CreateTable
CREATE TABLE "LegacyRefundReference" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "legacyTransNo" TEXT NOT NULL,
    "legacyBranchId" TEXT NOT NULL,
    "legacyRefundDate" TEXT NOT NULL,
    "legacyRefundTime" TEXT,
    "sourceRowCount" INTEGER NOT NULL,
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "netAmount" DECIMAL(18,2) NOT NULL,
    "vatAmount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacyRefundReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegacyRefundReference_refundId_key" ON "LegacyRefundReference"("refundId");

-- CreateIndex
CREATE INDEX "LegacyRefundReference_legacyRefundDate_idx" ON "LegacyRefundReference"("legacyRefundDate");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyRefundReference_sourceFileName_legacyBranchId_legacyRefundDate_legacyTransNo_key"
  ON "LegacyRefundReference"("sourceFileName", "legacyBranchId", "legacyRefundDate", "legacyTransNo");

-- AddForeignKey
ALTER TABLE "LegacyRefundReference"
  ADD CONSTRAINT "LegacyRefundReference_refundId_fkey"
  FOREIGN KEY ("refundId") REFERENCES "Refund"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
