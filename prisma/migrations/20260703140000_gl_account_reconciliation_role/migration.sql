-- CreateEnum
CREATE TYPE "GlAccountReconciliationRole" AS ENUM ('NONE', 'BANK', 'CASH');

-- AlterTable
ALTER TABLE "GlAccount" ADD COLUMN "reconciliationRole" "GlAccountReconciliationRole" NOT NULL DEFAULT 'NONE';

-- One-time data bootstrap from CoA conventions (migration layer only; domain logic uses reconciliationRole).
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
