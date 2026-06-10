# Finance Core 16A — Chart of Accounts Import & Browser

Status: Implemented  
Scope: CSV import/export, validation, preview, read-only browser

## CSV format

Required columns: `accountCode`, `accountName`, `accountType`, `normalBalance`  
Optional: `parentAccountCode`, `isActive`

`normalBalance` must match `accountType`:

| accountType | normalBalance |
|-------------|---------------|
| ASSET, EXPENSE | DEBIT |
| LIABILITY, EQUITY, REVENUE | CREDIT |

Download template: `GET /api/finance/accounts/import/template`

## Import rules

- Match existing accounts by `accountCode` → update
- New codes → insert
- Accounts **not** in the file are **never** deleted
- `accountType` cannot change once the account has journal line activity
- `isActive: false` blocked when journal lines exist
- Parent changes allowed; **warning** when journal activity exists

## Routes

| Route | Purpose |
|-------|---------|
| `/finance/accounts` | Read-only browser + export |
| `/finance/accounts/import` | CSV preview + apply |
| `GET /api/finance/accounts` | List/tree API |
| `GET /api/finance/accounts/export` | Export current COA CSV |
| `POST /api/finance/accounts/import/preview` | Preview (no writes) |
| `POST /api/finance/accounts/import` | Apply import |

Import apply requires `HO_FINANCE` or `HO_ADMIN` (period admin).

## Maintenance workflow

1. Export CSV from chart of accounts browser
2. Edit in spreadsheet
3. Re-import via preview → apply

Dev fallback seed: `npx tsx scripts/seed-finance-accounts.ts`
