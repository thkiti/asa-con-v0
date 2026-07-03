-- Document Archive Vault Phase 1 — central file row + polymorphic links.
-- Idempotent version for DBs that previously received schema via db push.

DO $$
BEGIN
  CREATE TYPE "DocumentArchiveStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED', 'SUPERSEDED', 'VOID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DocumentArchiveType" AS ENUM ('RECEIPT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DocumentKind" AS ENUM (
    'OPB','MJV','PAY','PAV','REV','PCV','CNT','ADJ','ORD','DEY','ORS','ORI',
    'REC','REF','COL','READ_X','READ_Z'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DocumentArchiveKind" AS ENUM (
    'DOCUMENT_PDF','BANK_PAY_IN_SLIP','RECEIPT_SLIP','REFUND_SLIP','READ_REPORT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DocumentArchive" (
    "id" TEXT NOT NULL,
    "archiveKind" "DocumentArchiveKind" NOT NULL DEFAULT 'DOCUMENT_PDF',
    "archiveNo" TEXT,
    "referenceNo" TEXT,
    "legalEntityCode" TEXT,
    "branchId" TEXT,
    "storagePath" TEXT,
    "storageUrl" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" INTEGER,
    "checksum" TEXT,
    "status" "DocumentArchiveStatus" NOT NULL DEFAULT 'PENDING',
    "archivedAt" TIMESTAMP(3),
    "archivedByStaffId" TEXT,
    "snapshotJson" JSONB,
    "snapshotVersion" INTEGER,
    "errorMessage" TEXT,
    "documentType" "DocumentArchiveType",
    "documentId" TEXT,
    "documentNo" TEXT,
    "pdfPath" TEXT,
    "pdfBlobUrl" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DocumentArchive_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DocumentArchiveLink" (
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

ALTER TABLE "Receipt"
ADD COLUMN IF NOT EXISTS "documentArchiveId" TEXT,
ADD COLUMN IF NOT EXISTS "pdfPath" TEXT,
ADD COLUMN IF NOT EXISTS "pdfBlobUrl" TEXT,
ADD COLUMN IF NOT EXISTS "pdfGeneratedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentArchive_documentType_documentId_key"
ON "DocumentArchive"("documentType", "documentId");

CREATE INDEX IF NOT EXISTS "DocumentArchive_legalEntityCode_archiveKind_archivedAt_idx"
ON "DocumentArchive"("legalEntityCode", "archiveKind", "archivedAt");

CREATE INDEX IF NOT EXISTS "DocumentArchive_branchId_archiveKind_createdAt_idx"
ON "DocumentArchive"("branchId", "archiveKind", "createdAt");

CREATE INDEX IF NOT EXISTS "DocumentArchive_status_idx"
ON "DocumentArchive"("status");

CREATE INDEX IF NOT EXISTS "DocumentArchiveLink_archiveId_idx"
ON "DocumentArchiveLink"("archiveId");

CREATE INDEX IF NOT EXISTS "DocumentArchiveLink_documentKind_documentId_idx"
ON "DocumentArchiveLink"("documentKind", "documentId");

CREATE INDEX IF NOT EXISTS "DocumentArchiveLink_documentKind_documentNo_idx"
ON "DocumentArchiveLink"("documentKind", "documentNo");

CREATE UNIQUE INDEX IF NOT EXISTS "Receipt_documentArchiveId_key"
ON "Receipt"("documentArchiveId");

ALTER TABLE "DocumentArchiveLink"
DROP CONSTRAINT IF EXISTS "DocumentArchiveLink_archiveId_fkey";

ALTER TABLE "DocumentArchiveLink"
ADD CONSTRAINT "DocumentArchiveLink_archiveId_fkey"
FOREIGN KEY ("archiveId") REFERENCES "DocumentArchive"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Receipt"
DROP CONSTRAINT IF EXISTS "Receipt_documentArchiveId_fkey";

ALTER TABLE "Receipt"
ADD CONSTRAINT "Receipt_documentArchiveId_fkey"
FOREIGN KEY ("documentArchiveId") REFERENCES "DocumentArchive"("id")
ON DELETE SET NULL ON UPDATE CASCADE;