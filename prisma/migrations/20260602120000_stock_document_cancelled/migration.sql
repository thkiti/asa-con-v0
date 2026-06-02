-- AlterEnum
ALTER TYPE "DocStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "StockDocument" ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelledByStaffId" TEXT,
ADD COLUMN "cancelReason" TEXT;
