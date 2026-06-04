# Prisma: Supabase DB without migration history

## What happened

`npx prisma migrate deploy` returns **P3005** when the database already has tables but was never tracked by Prisma Migrate (no `_prisma_migrations`, or empty history).

This project’s Supabase database is normally synced with:

```bash
npx prisma db push
```

Migration files in `prisma/migrations/` are the **source of truth for version control**, not necessarily how production was first created.

**`migrate deploy` failing does not damage the database** — Prisma stops before applying migrations.

## Fix: CENT_05 rounding only (your case)

1. **Do not** run `migrate deploy` again until you baseline (below).

2. Apply the enum upgrade with value mapping (old labels → new labels):

   **Supabase → SQL Editor** — paste and run:

   `scripts/apply-rounding-mode-enum.sql`

   Or from the repo:

   ```powershell
   cd D:\_projects\asa-con-v0
   npx prisma db execute --file scripts/apply-rounding-mode-enum.sql
   ```

3. Confirm schema matches:

   ```powershell
   npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
   ```

   Expected: no output (empty diff).

4. **Avoid** `npx prisma db push` alone for this enum change — Prisma may generate a cast that does not map `TWO_DECIMAL` / `HUNDRED_IF_GT_THRESHOLD`.

## Ongoing workflow (recommended)

| Task | Command |
|------|---------|
| Local / Supabase schema sync | `npx prisma db push` |
| Generate client | `npx prisma generate` |
| New schema change in repo | Edit `schema.prisma`, `db push`, commit; add migration SQL when you adopt Migrate |

## Optional: enable `migrate deploy` later (baseline)

Only if you want Prisma to track history on this database:

1. Apply any pending SQL manually (or ensure `migrate diff` is empty).
2. Mark all existing migrations as already applied (no SQL re-run):

   ```powershell
   npx prisma migrate resolve --applied "20260521120000_pos_checkout"
   npx prisma migrate resolve --applied "20260522120000_finance_kernel"
   npx prisma migrate resolve --applied "20260522130000_finance_refinements"
   npx prisma migrate resolve --applied "20260527120000_reconciliation_snapshots"
   npx prisma migrate resolve --applied "20260601120000_reopen_approval_workflow"
   npx prisma migrate resolve --applied "20260602120000_stock_document_cancelled"
   npx prisma migrate resolve --applied "20260603120000_pricing"
   npx prisma migrate resolve --applied "20260604120000_rounding_mode_cent05"
   ```

3. Then `npx prisma migrate deploy` should report “no pending migrations”.

Do **not** run `migrate deploy` before step 1–2 on a non-empty DB — you will get P3005 or duplicate-object errors.
