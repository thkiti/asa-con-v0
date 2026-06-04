-- Upgrade RoundingMode for Thailand CENT_05 (run once).
-- Supabase SQL Editor, or: npx prisma db execute --file scripts/apply-rounding-mode-enum.sql
--
-- Skip if pg_enum already lists CENT_05.
-- Do NOT use plain db push for this enum (old labels need mapping below).

DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoundingMode') THEN
    RAISE EXCEPTION 'RoundingMode enum not found. Run: npx prisma db push (pricing tables) first.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'RoundingMode' AND e.enumlabel = 'CENT_05'
  ) THEN
    RAISE NOTICE 'Already upgraded (CENT_05 exists). No changes made.';
    RETURN;
  END IF;

  CREATE TYPE "RoundingMode_new" AS ENUM (
    'NONE', 'CENT_01', 'CENT_05', 'BAHT_1', 'BAHT_10', 'BAHT_100'
  );

  ALTER TABLE "PricingPolicy"
    ALTER COLUMN "roundingMode" TYPE "RoundingMode_new"
    USING (
      CASE "roundingMode"::text
        WHEN 'TWO_DECIMAL' THEN 'CENT_01'::"RoundingMode_new"
        WHEN 'HUNDRED_IF_GT_THRESHOLD' THEN 'BAHT_100'::"RoundingMode_new"
        ELSE 'CENT_05'::"RoundingMode_new"
      END
    );

  DROP TYPE "RoundingMode";
  ALTER TYPE "RoundingMode_new" RENAME TO "RoundingMode";
END $guard$;
