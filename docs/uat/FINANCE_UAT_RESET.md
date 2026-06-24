# Finance UAT Reset Preparation

**Purpose:** Prepare a clean Finance UAT environment so staff can run Opening Balance setup without posting.  
**Rule:** Do **not** post during this exercise. Staff should stop at **Confirm** (before Post).

## Safety

1. **Backup first** — always run backup before reset.
2. **Dry run** — reset script defaults to dry run; lists exact row counts.
3. **Explicit confirm token** required for deletion.
4. **No CoA / master data** is removed by these scripts.

## Step 1 — Backup (required)

```bash
npm run uat:finance:backup
```

Writes to `data/uat-backups/finance-pre-reset-<timestamp>/`:

| File | Content |
|------|---------|
| `manifest.json` | Document numbers, statuses, counts |
| `manual-journal-entries.json` | All manual journal / OPB documents |
| `<branch>-<period>-trial-balance.csv` | Trial Balance snapshot |
| `<branch>-<period>-balance-sheet.csv` | Balance Sheet snapshot |
| `<branch>-<period>-profit-loss.csv` | P&L snapshot |

Store this folder as **UAT reference** before any deletion.

## Step 2 — Dry run (review what will be removed)

```bash
npm run uat:finance:reset:dry-run
```

For a **full** finance workflow reset (MJV/OPB + PAV/PCV/REV + related GL, excluding POS/stock):

```bash
npm run uat:finance:reset:full
# or explicitly:
npm run uat:finance:reset:full -- --dry-run
```

Review console output. Obtain stakeholder confirmation if operational GL (POS/stock) journals exist.

### Full reset execute (after backup + explicit confirm)

```bash
npm run uat:finance:reset:full -- --execute --confirm=FINANCE_RESET_CONFIRMED --include-posted-opb
```

`--include-posted-opb` is required when a **POSTED** opening balance exists (e.g. `OPB-260001`). Remote Supabase databases are detected and logged; execute always requires the confirm token.

### Scopes

| Scope | Removes | Preserves |
|-------|---------|-----------|
| `manual-only` (default) | All `ManualJournalEntry` (OPB, MJV, …), vouchers/journals for manual finance ref types | POS/stock GL, CoA, master data |
| `all-gl` | Above **plus** `POS_SALE`, `POS_REFUND`, `STOCK_DOC_POST` journals | CoA, branches, staff, products, sales rows, stock documents |

**Risk (`all-gl`):** Deletes GL vouchers for POS/stock. Sales and stock rows remain but finance trace links break until re-posted.

## Step 3 — Execute reset (only after backup + confirmation)

```bash
npx tsx scripts/uat/finance-uat-reset.ts --scope=manual-only --execute --confirm=FINANCE_UAT_RESET_CONFIRMED
```

## Step 4 — Verify

```bash
npm run uat:finance:verify
```

Expected after `manual-only` reset (no operational GL):

- CoA exists
- Opening Balance list empty
- No manual journal entries
- Trial Balance / Balance Sheet / P&L show no activity

## Tables affected (reset)

| Table | Action |
|-------|--------|
| `ManualJournalEntryLine` | Cascade delete with parent |
| `ManualJournalEntry` | Delete all |
| `JournalEntryLine` | Cascade delete with journal |
| `JournalEntry` | Delete (scoped ref types) |
| `VoucherLine` | Cascade delete with voucher |
| `Voucher` | Delete (scoped ref types) |

## Tables preserved

- `GlAccount` (Chart of Accounts)
- `LegalEntity`, `Branch`, `Staff`
- `Product`, `Stock`, `Sale`, POS tables
- `AccountingPeriod` (status unchanged; reopen manually if needed)
- `AccountingPeriodCloseEvidence` / reopen audit rows (append-only)

## UAT workflow (staff)

1. Review CoA (`/finance/accounts`)
2. Create Opening Balance (`/finance/opening-balance/new`)
3. Submit
4. Confirm
5. Open Trial Balance / Balance Sheet (preview — **do not Post**)
6. Record UI questions vs accounting questions (see below)

### Observation rules

| Staff asks… | Record as |
|-------------|-----------|
| Which account? Debit or credit? Treatment? | Accounting question |
| Where is the button? What does this screen mean? | **UI/UX finding** |

**When uncertain, staff must ask. Do not guess.**
