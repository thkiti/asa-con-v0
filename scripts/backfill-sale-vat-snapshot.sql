-- Optional backfill: historical Sale rows before P1.25 checkout snapshot.
-- Assumes 7% VAT-inclusive (700 bps) and output VAT account 4602.
-- Run AFTER apply-sale-vat-snapshot.sql. Leaves already-snapshotted rows unchanged.

UPDATE "Sale"
SET
  "netAmount" = ROUND("total" / 1.07, 2),
  "vatAmount" = "total" - ROUND("total" / 1.07, 2),
  "vatRateBps" = 700,
  "taxCode" = 'VAT_OUTPUT_STANDARD',
  "outputVatAccountCode" = '4602'
WHERE "netAmount" IS NULL
  AND "status" = 'COMPLETED';
