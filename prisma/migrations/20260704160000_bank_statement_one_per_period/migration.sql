-- Remove empty duplicate bank statements when another row exists for the same period.
DELETE FROM "BankStatement" AS dup
WHERE NOT EXISTS (
  SELECT 1
  FROM "BankStatementLine" AS line
  WHERE line."bankStatementId" = dup.id
)
AND EXISTS (
  SELECT 1
  FROM "BankStatement" AS keep
  WHERE keep."legalEntityCode" = dup."legalEntityCode"
    AND keep."bankAccountId" = dup."bankAccountId"
    AND keep."periodKey" = dup."periodKey"
    AND keep.id <> dup.id
    AND (
      keep."statementNo" < dup."statementNo"
      OR EXISTS (
        SELECT 1
        FROM "BankStatementLine" AS keep_line
        WHERE keep_line."bankStatementId" = keep.id
      )
    )
);

-- Enforce one bank statement workspace row per entity + bank account + period.
CREATE UNIQUE INDEX "BankStatement_legalEntityCode_bankAccountId_periodKey_key"
  ON "BankStatement"("legalEntityCode", "bankAccountId", "periodKey");
