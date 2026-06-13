# Finance Core 16J — General Ledger

**Status:** Done  
**Scope:** Read-only account-level ledger drill-down from posted journal data.

General Ledger formalizes the account drill-down report originally introduced as Finance Core 16D. It is **not** a replacement for Trial Balance (16C) — use trial balance for period integrity across all accounts; use general ledger to inspect one account’s opening balance, movements, and closing balance.

**Related:** [33_FINANCE_CORE_16F_BALANCE_SHEET.md](./33_FINANCE_CORE_16F_BALANCE_SHEET.md) · [36_FINANCE_CORE_16I_CHANGES_IN_EQUITY.md](./36_FINANCE_CORE_16I_CHANGES_IN_EQUITY.md) (composes GL opening/closing for equity accounts)

### What 16J is not

| Report | Role |
|--------|------|
| Trial Balance (16C) | All accounts, period debit/credit totals |
| General Ledger (16J) | **One account**, line-by-line with running balance |
| Balance Sheet (16F) | A/L/E statement from trial balance aggregation |
| Cash Flow | Done — see [38_FINANCE_CORE_16K_CASH_FLOW.md](./38_FINANCE_CORE_16K_CASH_FLOW.md) |

---

## Purpose

For a scoped account and date range, answer:

- Opening balance before the range start
- Journal lines within the range (debit, credit, signed movement, running balance)
- Closing balance (= opening + signed period movement)

Finance users can trace activity to journal inquiry via `journalEntryId` / `journalLineId`.

---

## Architecture

| Layer | Module |
|-------|--------|
| Domain | `lib/finance/reports/general-ledger.ts` |
| Types | `lib/finance/reports/general-ledger-types.ts` |
| Sign helpers | `lib/finance/reports/balance-helpers.ts` (`signedBalanceForAccountType`) |
| Filter parse | `lib/finance/reports/report-filter.ts` (`parseGeneralLedgerFilter`) |
| Date range | `resolveReportDateRange` — calendar month when `periodKey` is used |
| API | `GET /api/finance/reports/general-ledger` |
| UI adapter | `lib/finance-ui/general-ledger.ts` |
| UI | `/finance/reports/general-ledger` |

---

## Input

Query parameters:

| Param | Required | Notes |
|-------|----------|-------|
| `branchId` | Yes | Branch filter (same as other finance reports) |
| `periodKey` | One of period or range | `YYYY-MM` — resolves to calendar month dates |
| `from` / `to` | One of period or range | Inclusive date range |
| `accountId` | UI: one account scope | Single GL account UUID |
| `accountIds` | No | Multi-account (power users / internal composition) |
| `accountCode` | UI: one account scope | Single account code (primary UI path) |
| `accountCodes` | No | Multi-account by code |

**UI:** requires `accountCode` (or `accountId`) before refresh — one account at a time.

**API backward compatibility:** omitting account filters returns all active accounts (used internally by Changes in Equity composition).

**Note:** When using `periodKey`, GL scopes by **journal entry date** (calendar month). Trial Balance with `periodKey` scopes by **accounting period FK** — totals may differ if journal dates and period assignments diverge.

---

## Calculation model

1. **Opening balance** — sum journal lines for the account with `journalEntry.date < range.start`, signed by account type.
2. **Period lines** — posted journal lines in `[range.start, range.endExclusive)` for the branch.
3. **Running balance** — application-layer cumulative sum using `signedBalanceForAccountType` per line.
4. **Closing balance** — final running balance; equals opening + sum of signed movements.

**Sort order (deterministic):** `date` → `voucherNo` → `lineNo` → `journalLineId`.

---

## Output

```typescript
{
  filter: GeneralLedgerFilter,
  accounts: [{
    accountCode, accountName, accountType,
    openingDebit, openingCredit, openingBalance,
    transactions: [{
      journalEntryId, journalLineId,
      journalDate, entryNo, sourceRef,
      description, lineMemo,
      debit, credit, signedMovement, runningBalance
    }],
    closingBalance
  }]
}
```

- **`sourceRef`** — `voucher.refNo` when present (operational document reference).
- **`signedMovement`** — account-type-normalized line movement (debit-normal vs credit-normal).

---

## Rules

- **Read-only** — no mutations to periods, journals, or reconciliation.
- **Posted data only** — journal lines exist only after voucher posting.
- **No nested transactions** — domain accepts `PrismaClient` or mock tx; no `$transaction`.
- **No second accounting engine** — reuses existing sign helpers and journal line queries.
- **Not a dashboard, cash flow, or year-end close** — out of scope.

---

## UI

- Branch, account code (required), period or date range.
- Table: Date | Ref (entry no + source ref) | Description | Debit | Credit | Running Balance.
- Opening/closing balance summary per account.
- Journal inquiry links on description.
- CSV export and print (same pattern as other finance reports).

---

## Related phases

| Phase | Scope |
|-------|-------|
| 16A | CoA import |
| 16B | Manual journal |
| 16C | Trial balance |
| **16J** | **General ledger (this doc)** |
| 16E | Profit & loss |
| 16F | Balance sheet |
| 16G | Retained earnings |
| 16H | Closing entry |
| 16I | Changes in equity (composes GL) |

---

## Tests

| Area | Location |
|------|----------|
| Domain | `__tests__/lib/finance/reports/general-ledger.test.ts` |
| API route | `__tests__/app/api/finance/general-ledger-route.test.ts` |

Domain tests cover opening balance, running/closing balance, account-type signed direction, date range filtering, `accountId` filter, row shape (`journalLineId`, `sourceRef`, `signedMovement`), and trial balance reconciliation.

---

## Future (out of scope)

- Finance dashboard
- Year-end close workflow
- Optional persisted cash-flow metadata on `GlAccount` if config maintenance becomes burdensome
