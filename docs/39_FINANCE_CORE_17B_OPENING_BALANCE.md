# Finance Core 17B — Manual Opening Balance Operations

Status: Implemented  
Scope: OPB shortcut, editor mode, validation, inquiry hub, posting verification

## Architecture

Opening balance uses the existing `ManualJournalEntry` workflow (Phase 17A). No separate `OpeningBalance` model.

```
ManualJournalEntry (OPENING_BALANCE) → Voucher (OPENING_BALANCE_JOURNAL) → JournalEntry → Reports
```

Document numbers: `OPB-YY####` per [99_ASA_HANDBOOK.md](./99_ASA_HANDBOOK.md).

## OPB validation

Applied at submit and post when `entryType = OPENING_BALANCE`:

| Rule | Error code |
|------|------------|
| Balance-sheet accounts only (no REVENUE/EXPENSE) | `OPB_PL_ACCOUNT_NOT_ALLOWED` |
| One posted OPB per legal entity per calendar day | `OPB_DUPLICATE_POSTED` |

Standard balanced-line and active-account checks still apply.

## Routes

| Route | Purpose |
|-------|---------|
| `/finance/opening-balance` | OPB inquiry hub (filtered list) |
| `/finance/opening-balance/new` | Create OPB shortcut |
| `/finance/opening-balance/[id]` | OPB editor (locked type) |
| `GET /api/finance/manual-journal-entries/[id]/posting-verification` | Posting verification for posted OPB |

All other workflow APIs reuse Phase 17A (`/api/finance/manual-journal-entries/*`).

## Posting verification

After POST, the OPB editor shows:

- Entry vs posted journal totals match
- Trial balance balanced for posting period
- Per-line GL presence (`sourceRef` = `OPB-*`)

## Out of scope (deferred)

- CSV import / preview-apply
- Migration bridge scripts
- Excel / DBF runtime integration

## Domain modules

- `lib/finance/manual-journal-entry/manual-journal-entry-opening-balance-rules.ts`
- `lib/finance/manual-journal-entry/manual-journal-entry-posting-verification.ts`
