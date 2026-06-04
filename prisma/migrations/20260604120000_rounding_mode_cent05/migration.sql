-- Replace RoundingMode enum (Thailand 25/50 satang + baht steps)

CREATE TYPE "RoundingMode_new" AS ENUM (
  'NONE',
  'CENT_01',
  'CENT_05',
  'BAHT_1',
  'BAHT_10',
  'BAHT_100'
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
