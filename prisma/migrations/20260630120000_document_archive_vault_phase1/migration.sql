-- Document Archive Vault Phase 1 — central file row + polymorphic links.
-- Evolves pilot DocumentArchive (schema-only until this migration) and Receipt archive columns.

-- CreateEnum
CREATE TYPE "DocumentArchiveStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED', 'SUPERSEDED', 'VOID');

-- CreateEnum
CREATE TYPE "DocumentArchiveType" AS ENUM ('RECEIPT');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM (
    'OPB',
    'MJV',
    'PAY',
    'PAV',
    'REV',
    'PCV',
    'CNT',
    'ADJ',
    'ORD',
    'DEY',
    'ORS',
    'ORI',
    'REC',
    'REF',
    'COL',
    'READ_X',
    'READ_Z'
);

-- CreateEnum
CREATE TYPE "DocumentArchiveKind" AS ENUM (
    'DOCUMENT_PDF',
    'BANK_PAY_IN_SLIP',
    'RECEIPT_SLIP',
    'REFUND_SLIP',
    'READ_REPORT'
);

-- CreateTable
CREATE TABLE "DocumentArchive" (
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

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "documentArchiveId" TEXT,
ADD COLUMN     "pdfPath" TEXT,
ADD COLUMN     "pdfBlobUrl" TEXT,
ADD COLUMN     "pdfGeneratedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentArchive_documentType_documentId_key" ON "DocumentArchive"("documentType", "documentId");

-- CreateIndex
CREATE INDEX "DocumentArchive_legalEntityCode_archiveKind_archivedAt_idx" ON "DocumentArchive"("legalEntityCode", "archiveKind", "archivedAt");

-- CreateIndex
CREATE INDEX "DocumentArchive_branchId_archiveKind_createdAt_idx" ON "DocumentArchive"("branchId", "archiveKind", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentArchive_status_idx" ON "DocumentArchive"("status");

-- CreateIndex
CREATE INDEX "DocumentArchiveLink_archiveId_idx" ON "DocumentArchiveLink"("archiveId");

-- CreateIndex
CREATE INDEX "DocumentArchiveLink_documentKind_documentId_idx" ON "DocumentArchiveLink"("documentKind", "documentId");

-- CreateIndex
CREATE INDEX "DocumentArchiveLink_documentKind_documentNo_idx" ON "DocumentArchiveLink"("documentKind", "documentNo");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_documentArchiveId_key" ON "Receipt"("documentArchiveId");

-- AddForeignKey
ALTER TABLE "DocumentArchiveLink" ADD CONSTRAINT "DocumentArchiveLink_archiveId_fkey" FOREIGN KEY ("archiveId") REFERENCES "DocumentArchive"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_documentArchiveId_fkey" FOREIGN KEY ("documentArchiveId") REFERENCES "DocumentArchive"("id") ON DELETE SET NULL ON UPDATE CASCADE;
