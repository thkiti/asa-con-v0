-- Rename legacy PAY document numbers to canonical PAV (Payment Voucher).
-- Prisma model PaymentVoucher unchanged; only the display/allocation code changes.

UPDATE "PaymentVoucher"
SET "entryNo" = REPLACE("entryNo", 'PAY-', 'PAV-')
WHERE "entryNo" LIKE 'PAY-%';

UPDATE "Voucher"
SET "refNo" = REPLACE("refNo", 'PAY-', 'PAV-')
WHERE "refNo" LIKE 'PAY-%';
