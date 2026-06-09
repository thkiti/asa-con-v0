-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'BANK_TRANSFER';

-- CreateEnum
CREATE TYPE "PaymentEvidenceStatus" AS ENUM ('PENDING', 'UPLOADED', 'MISSING');

-- CreateTable
CREATE TABLE "PaymentEvidence" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "status" "PaymentEvidenceStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvidence_receiptId_key" ON "PaymentEvidence"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvidence_saleId_key" ON "PaymentEvidence"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvidence_paymentId_key" ON "PaymentEvidence"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvidence_branchId_receiptNo_key" ON "PaymentEvidence"("branchId", "receiptNo");

-- CreateIndex
CREATE INDEX "PaymentEvidence_branchId_status_idx" ON "PaymentEvidence"("branchId", "status");

-- AddForeignKey
ALTER TABLE "PaymentEvidence" ADD CONSTRAINT "PaymentEvidence_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvidence" ADD CONSTRAINT "PaymentEvidence_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvidence" ADD CONSTRAINT "PaymentEvidence_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
