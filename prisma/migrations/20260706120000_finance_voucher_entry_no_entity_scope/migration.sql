-- Finance operational voucher business document numbers are unique per legal entity.
-- ASAS and ASAD may both use PAV-260001, PCV-260001, REV-260001, INV-260001, etc.

DROP INDEX IF EXISTS "PaymentVoucher_entryNo_key";
DROP INDEX IF EXISTS "PettyCashVoucher_entryNo_key";
DROP INDEX IF EXISTS "RevenueVoucher_entryNo_key";
DROP INDEX IF EXISTS "InvoiceVoucher_entryNo_key";

CREATE UNIQUE INDEX "PaymentVoucher_legalEntityCode_entryNo_key"
  ON "PaymentVoucher"("legalEntityCode", "entryNo");

CREATE UNIQUE INDEX "PettyCashVoucher_legalEntityCode_entryNo_key"
  ON "PettyCashVoucher"("legalEntityCode", "entryNo");

CREATE UNIQUE INDEX "RevenueVoucher_legalEntityCode_entryNo_key"
  ON "RevenueVoucher"("legalEntityCode", "entryNo");

CREATE UNIQUE INDEX "InvoiceVoucher_legalEntityCode_entryNo_key"
  ON "InvoiceVoucher"("legalEntityCode", "entryNo");
