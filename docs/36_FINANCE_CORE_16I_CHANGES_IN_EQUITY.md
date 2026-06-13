# Finance Core 16I — Statement of Changes in Equity

**Status:** Done  
**Scope:** Read-only equity movement matrix for one branch and period (or date range). **No journal creation, no posting, no schema changes.**

Related: [33_FINANCE_CORE_16F_BALANCE_SHEET.md](./33_FINANCE_CORE_16F_BALANCE_SHEET.md), [34_FINANCE_CORE_16G_RETAINED_EARNINGS.md](./34_FINANCE_CORE_16G_RETAINED_EARNINGS.md), [35_FINANCE_CORE_16H_CLOSING_ENTRY.md](./35_FINANCE_CORE_16H_CLOSING_ENTRY.md)

---

## Purpose

Show how each **equity** GL account moved between opening and closing balance for the selected scope:

```
Opening balance
+ Profit for period (account 301 only)
+ Other changes (equity journals in period, excluding closing entry)
= Closing balance
```

This is the formal **statement of changes in equity** — not a substitute for balance sheet, retained earnings bridge, or closing entry posting.

---

## What 16I is not

| Report | Role |
|--------|------|
| **16F Balance Sheet** | Snapshot of assets, liabilities, and equity at period end (trial balance aggregation). |
| **16G Retained Earnings** | Economic bridge: posted RE (301) + current P&amp;L net income before close. |
| **16H Closing Entry** | Posts P&amp;L → account 301 via `PERIOD_CLOSING_ENTRY` voucher. |
| **16I Changes in Equity** | Matrix of equity account movements with reconciliation check. |

16I uses **cumulative GL opening/closing** logic (same family as General Ledger), not period-scoped balance sheet totals.

---

## Architecture

| Layer | Module |
|-------|--------|
| Domain | `lib/finance/reports/changes-in-equity.ts` — `getChangesInEquity` |
| Types | `lib/finance/reports/changes-in-equity-types.ts` |
| Filter parse | `lib/finance/reports/report-filter.ts` — `parseChangesInEquityFilter` |
| Composition | `getGeneralLedger` (equity accounts) + `getProfitLoss` + `getActiveClosingEntry` |
| Retained earnings account | Code **`301` only** (profit row) |
| API | `GET /api/finance/reports/changes-in-equity` |
| UI adapter | `lib/finance-ui/changes-in-equity.ts` |
| UI | `/finance/reports/changes-in-equity` — `ChangesInEquityPage` |

**No schema changes.** Read-only queries only; no nested `prisma.$transaction` in domain.

---

## Input

Same convention as Trial Balance / P&amp;L / Balance Sheet / Retained Earnings:

| Param | Required | Notes |
|-------|----------|-------|
| `branchId` | Yes | Branch filter |
| `periodKey` | One of period or range | `YYYY-MM` |
| `from` / `to` | One of period or range | Inclusive date range |

---

## Calculation model

### Opening and closing

- Load all active **EQUITY** accounts.
- Call `getGeneralLedger` with those account codes.
- **Opening** = cumulative signed balance before range start.
- **Closing** = opening + in-range journal activity (includes closing entry effect on RE).

### Profit for period

- If an **active closing entry** exists for the period → use its `netIncome` (`profitSource = CLOSING_ENTRY`). **Posted truth.**
- Otherwise → use `getProfitLoss().netIncome` (`profitSource = PROFIT_LOSS`). **Open-period preview.**
- Profit amount appears **only on account `301`**.

### Other changes

- Sum signed equity journal lines **in the report date range**.
- **Exclude** vouchers with `refType = PERIOD_CLOSING_ENTRY` (avoid double-counting profit already on the profit row).
- Includes manual equity journals, capital movements, etc.
- **Not labeled as dividends** in v1 — no dividend refType or workflow.

### Active columns

An equity account column is shown when it has non-zero opening, closing, other changes, or profit (301 only).

### Reconciliation

Per column: `(opening + profit + other) − closing` should be zero.

Warnings when reconciliation fails or data is incomplete.

---

## Output

```typescript
{
  filter, period,
  columns[],           // equity accounts in scope
  rows[],              // OPENING, PROFIT_FOR_PERIOD, OTHER_CHANGES, CLOSING, RECONCILIATION_CHECK
  profitForPeriod,
  profitSource,        // CLOSING_ENTRY | PROFIT_LOSS
  retainedEarningsAccountCode,
  activeClosingEntry,
  reconciliation: { isBalanced, columnDifferences, totalDifference },
  warnings[]
}
```

### Warning codes

| Code | Meaning |
|------|---------|
| `NO_RETAINED_EARNINGS_ACCOUNT` | Account 301 not in active columns |
| `PROFIT_CLOSING_ENTRY_MISMATCH` | Posted closing entry net income ≠ current P&amp;L |
| `UNCLOSED_PROFIT_PERIOD` | Profit from P&amp;L; closing GL excludes unposted net income |
| `RECONCILIATION_DIFFERENCE` | Opening + profit + other ≠ closing for one or more accounts |

---

## Rules

- **Read-only** — no mutations.
- **No dividend auto-labeling** — “Other changes” is generic equity journal activity.
- **No Cash Flow** — deferred to a later phase (16J).
- **No configurable RE account** in v1 — code `301` only (same as 16G/16H).

---

## UI

- Matrix table: row label × equity account columns + total.
- Profit source banner (posted closing entry vs P&amp;L preview).
- Warnings banner for the codes above.
- CSV export and print (same pattern as other finance reports).

---

## Tests

| Area | Location |
|------|----------|
| Domain | `__tests__/lib/finance/reports/changes-in-equity.test.ts` |
| API route | `__tests__/app/api/finance/changes-in-equity-route.test.ts` |
| CSV adapter | `__tests__/lib/finance-ui/changes-in-equity.test.ts` |

---

## Future (out of 16I scope)

- **16J Cash Flow** — next approved finance report phase.
- Dividend-specific refType / labels in other changes row.
- Configurable retained earnings account mapping.
- Multi-entity consolidation.
