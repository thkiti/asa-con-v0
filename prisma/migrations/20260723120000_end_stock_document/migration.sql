-- END Stock Document + DEY shop receipt support
-- END is a locked period quantity summary. Locking END does not create
-- StockTransaction, modify live Stock balances, calculate cost, or post inventory Finance.

-- AlterEnum DocType
ALTER TYPE "DocType" ADD VALUE IF NOT EXISTS 'END';

-- AlterEnum DocumentKind
ALTER TYPE "DocumentKind" ADD VALUE IF NOT EXISTS 'END';

-- CreateEnum
CREATE TYPE "EndWorkflowStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'LOCKED');

-- CreateEnum
CREATE TYPE "EndContributionKind" AS ENUM ('IN', 'USAGE', 'COUNT');

-- CreateEnum
CREATE TYPE "EndAuditEventType" AS ENUM (
  'CREATED',
  'REBUILT',
  'IMPORTED',
  'SUBMITTED',
  'LOCKED',
  'REOPENED',
  'MANUAL_BEGIN',
  'MANUAL_COUNT'
);

-- AlterTable StockDocument
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "shopReceivedAt" TIMESTAMP(3);
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "shopReceivedByStaffId" TEXT;
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endPeriodKey" TEXT;
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endStatus" "EndWorkflowStatus";
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endRebuiltAt" TIMESTAMP(3);
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endRebuiltByStaffId" TEXT;
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endSourceRebuildVersion" INTEGER DEFAULT 0;
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endLockedAt" TIMESTAMP(3);
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endLockedByStaffId" TEXT;
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endReopenedAt" TIMESTAMP(3);
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endReopenedByStaffId" TEXT;
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endReopenReason" TEXT;
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endCompletenessOk" BOOLEAN DEFAULT false;
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endCompletenessNotes" TEXT;
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endTotalAdjAmount" DECIMAL(18,2);
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endTrackableSales" DECIMAL(18,2);
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endUntrackableSales" DECIMAL(18,2);
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endTotalSales" DECIMAL(18,2);
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endRefundsTotal" DECIMAL(18,2);
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endInitImportMeta" JSONB;
ALTER TABLE "StockDocument" ADD COLUMN IF NOT EXISTS "endUpdatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "StockDocument_endPeriodKey_key" ON "StockDocument"("endPeriodKey");
CREATE INDEX IF NOT EXISTS "StockDocument_docType_legalEntityCode_branchId_periodMonth_idx"
  ON "StockDocument"("docType", "legalEntityCode", "branchId", "periodMonth");

-- AlterTable StockDocumentLine
ALTER TABLE "StockDocumentLine" ADD COLUMN IF NOT EXISTS "receivedQty" INTEGER;

-- CreateTable EndLine
CREATE TABLE IF NOT EXISTS "EndLine" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "beginQty" INTEGER NOT NULL DEFAULT 0,
  "inQty" INTEGER NOT NULL DEFAULT 0,
  "usageQty" INTEGER NOT NULL DEFAULT 0,
  "actualQty" INTEGER NOT NULL DEFAULT 0,
  "countQty" INTEGER,
  "endingQty" INTEGER,
  "adjQty" INTEGER,
  "sellingPriceSnapshot" DECIMAL(18,2),
  "sellingPriceSource" TEXT,
  "sellingPriceEffectiveFrom" TIMESTAMP(3),
  "adjAmount" DECIMAL(18,2),
  "beginManual" BOOLEAN NOT NULL DEFAULT false,
  "countManual" BOOLEAN NOT NULL DEFAULT false,
  "priceIncomplete" BOOLEAN NOT NULL DEFAULT false,
  "countIncomplete" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EndLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EndLine_documentId_productId_key" ON "EndLine"("documentId", "productId");
CREATE INDEX IF NOT EXISTS "EndLine_documentId_idx" ON "EndLine"("documentId");
CREATE INDEX IF NOT EXISTS "EndLine_productId_idx" ON "EndLine"("productId");

-- CreateTable EndSourceContribution
CREATE TABLE IF NOT EXISTS "EndSourceContribution" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sourceDocumentType" TEXT NOT NULL,
  "sourceDocumentId" TEXT NOT NULL,
  "sourceLineId" TEXT NOT NULL,
  "contributionKind" "EndContributionKind" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EndSourceContribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EndSourceContribution_documentId_sourceDocumentType_sourceDocumentId_sourceLineId_contributionKind_key"
  ON "EndSourceContribution"("documentId", "sourceDocumentType", "sourceDocumentId", "sourceLineId", "contributionKind");
CREATE INDEX IF NOT EXISTS "EndSourceContribution_documentId_productId_idx"
  ON "EndSourceContribution"("documentId", "productId");
CREATE INDEX IF NOT EXISTS "EndSourceContribution_documentId_contributionKind_idx"
  ON "EndSourceContribution"("documentId", "contributionKind");

-- CreateTable EndAuditEvent
CREATE TABLE IF NOT EXISTS "EndAuditEvent" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "eventType" "EndAuditEventType" NOT NULL,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "byStaffId" TEXT,
  "reason" TEXT,
  "payload" JSONB,

  CONSTRAINT "EndAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EndAuditEvent_documentId_at_idx" ON "EndAuditEvent"("documentId", "at");

-- FKs
DO $$ BEGIN
  ALTER TABLE "EndLine" ADD CONSTRAINT "EndLine_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "StockDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "EndLine" ADD CONSTRAINT "EndLine_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "EndSourceContribution" ADD CONSTRAINT "EndSourceContribution_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "StockDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "EndAuditEvent" ADD CONSTRAINT "EndAuditEvent_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "StockDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
