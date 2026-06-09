-- AlterTable
ALTER TABLE "PaymentEvidence" ADD COLUMN "blobPathname" TEXT,
ADD COLUMN "blobUrl" TEXT,
ADD COLUMN "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
ADD COLUMN "byteSize" INTEGER,
ADD COLUMN "uploadedAt" TIMESTAMP(3),
ADD COLUMN "uploadError" TEXT;
