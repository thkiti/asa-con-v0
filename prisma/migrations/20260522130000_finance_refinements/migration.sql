ALTER TYPE "AccountingPeriodStatus" RENAME VALUE 'CLOSED' TO 'HARD_CLOSED';
ALTER TYPE "AccountingPeriodStatus" ADD VALUE 'SOFT_CLOSED';
CREATE UNIQUE INDEX "Voucher_voucherNo_key" ON "Voucher"("voucherNo");