-- Rename legacy MAJ document numbers to canonical MJV (Manual Journal Voucher).
-- Prisma enum ManualJournalEntryType stays MANUAL; only the display/allocation code changes.

UPDATE "ManualJournalEntry"
SET "entryNo" = REPLACE("entryNo", 'MAJ-', 'MJV-')
WHERE "entryNo" LIKE 'MAJ-%';

UPDATE "Voucher"
SET "refNo" = REPLACE("refNo", 'MAJ-', 'MJV-')
WHERE "refNo" LIKE 'MAJ-%';
