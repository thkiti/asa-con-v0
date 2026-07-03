UPDATE "GlAccount"
SET "reconciliationRole" = 'BANK'
WHERE "reconciliationRole" = 'NONE'
  AND "deleted" = false
  AND "isActive" = true
  AND "accountType" = 'ASSET'
  AND "code" LIKE '102%';

UPDATE "GlAccount"
SET "reconciliationRole" = 'CASH'
WHERE "reconciliationRole" = 'NONE'
  AND "deleted" = false
  AND "isActive" = true
  AND "accountType" = 'ASSET'
  AND ("code" = '1001' OR "code" LIKE '1001%');
