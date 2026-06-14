-- CreateEnum
CREATE TYPE "LegacySalesImportBatchStatus" AS ENUM ('STAGING', 'VALIDATED', 'CONVERTING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "LegacySalesImportRowStatus" AS ENUM ('PENDING', 'VALID', 'INVALID', 'IMPORTED', 'SKIPPED');

-- CreateTable
CREATE TABLE "LegacySalesImportBatch" (
    "id" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "LegacySalesImportBatchStatus" NOT NULL DEFAULT 'STAGING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "acceptedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedOldRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "importedTransactions" INTEGER NOT NULL DEFAULT 0,
    "importedLines" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacySalesImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacySalesImportRow" (
    "id" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sourceRowNo" INTEGER NOT NULL,
    "legacyTransNo" TEXT NOT NULL,
    "legacyDate" TEXT NOT NULL,
    "legacyTime" TEXT NOT NULL,
    "legacyBranchId" TEXT NOT NULL,
    "legacyStaffId" TEXT,
    "legacyProductCode" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "normalizedSaleDateTime" TIMESTAMP(3),
    "importBatchId" TEXT NOT NULL,
    "status" "LegacySalesImportRowStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "mappedBranchId" TEXT,
    "mappedStaffId" TEXT,
    "mappedProductId" TEXT,
    "createdSaleId" TEXT,
    "createdReceiptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacySalesImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacySaleReference" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "legacyTransNo" TEXT NOT NULL,
    "legacyBranchId" TEXT NOT NULL,
    "legacySaleDate" TEXT NOT NULL,
    "legacySaleTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacySaleReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegacySalesImportBatch_sourceFileName_year_idx" ON "LegacySalesImportBatch"("sourceFileName", "year");

-- CreateIndex
CREATE INDEX "LegacySalesImportBatch_startedAt_idx" ON "LegacySalesImportBatch"("startedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "LegacySalesImportRow_sourceFileName_sourceRowNo_key" ON "LegacySalesImportRow"("sourceFileName", "sourceRowNo");

-- CreateIndex
CREATE INDEX "LegacySalesImportRow_importBatchId_status_idx" ON "LegacySalesImportRow"("importBatchId", "status");

-- CreateIndex
CREATE INDEX "LegacySalesImportRow_importBatchId_legacyTransNo_idx" ON "LegacySalesImportRow"("importBatchId", "legacyTransNo");

-- CreateIndex
CREATE INDEX "LegacySalesImportRow_mappedBranchId_legacyDate_legacyTransNo_idx" ON "LegacySalesImportRow"("mappedBranchId", "legacyDate", "legacyTransNo");

-- CreateIndex
CREATE UNIQUE INDEX "LegacySaleReference_saleId_key" ON "LegacySaleReference"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "LegacySaleReference_sourceFileName_legacyBranchId_legacySaleDate_legacyTransNo_key" ON "LegacySaleReference"("sourceFileName", "legacyBranchId", "legacySaleDate", "legacyTransNo");

-- CreateIndex
CREATE INDEX "LegacySaleReference_importBatchId_idx" ON "LegacySaleReference"("importBatchId");

-- AddForeignKey
ALTER TABLE "LegacySalesImportRow" ADD CONSTRAINT "LegacySalesImportRow_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "LegacySalesImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacySaleReference" ADD CONSTRAINT "LegacySaleReference_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacySaleReference" ADD CONSTRAINT "LegacySaleReference_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "LegacySalesImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
