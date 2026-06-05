-- AlterTable
ALTER TABLE "Refund" ADD COLUMN "refundNo" TEXT;

-- Backfill any pre-existing rows (legacy placeholder; table expected empty in v0)
UPDATE "Refund" SET "refundNo" = 'REF-LEGACY-' || "id" WHERE "refundNo" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Refund_refundNo_key" ON "Refund"("refundNo");

-- AlterTable
ALTER TABLE "Refund" ALTER COLUMN "refundNo" SET NOT NULL;
