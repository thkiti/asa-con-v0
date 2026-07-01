-- Manual journal business document numbers are unique per legal entity, not globally.
-- ASAS and ASAD may both use MJV-260001; entity is shown in document context.

DROP INDEX IF EXISTS "ManualJournalEntry_entryNo_key";

CREATE UNIQUE INDEX "ManualJournalEntry_legalEntityCode_entryNo_key"
  ON "ManualJournalEntry"("legalEntityCode", "entryNo");
