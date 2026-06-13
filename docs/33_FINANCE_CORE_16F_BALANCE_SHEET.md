# Finance Core 16F — Balance Sheet

**Status:** Done  
**Scope:** Read-only financial statement layer from posted journal data.

Balance Sheet read-only statement layer implemented. **Retained Earnings** analysis is **16G**; **Closing Entry** posting is **16H** — see [35_FINANCE_CORE_16H_CLOSING_ENTRY.md](./35_FINANCE_CORE_16H_CLOSING_ENTRY.md).

### Finance Core chain

**16F** (this doc) → **16G** retained earnings bridge → **16H** closing entry posting. See [34_FINANCE_CORE_16G_RETAINED_EARNINGS.md](./34_FINANCE_CORE_16G_RETAINED_EARNINGS.md) and [35_FINANCE_CORE_16H_CLOSING_ENTRY.md](./35_FINANCE_CORE_16H_CLOSING_ENTRY.md).

---

## Purpose

Generate a balance sheet (assets, liabilities, equity) from the same posted journal scope as Trial Balance (16C). No closing entries, no retained-earnings computation beyond existing equity account balances.

---

## Architecture

| Layer | Module |
|-------|--------|
| Domain | `lib/finance/reports/balance-sheet.ts` |
| Types | `lib/finance/reports/balance-sheet-types.ts` |
| Sign helpers | `lib/finance/reports/balance-helpers.ts` (`isBalanceSheetBalanced`, `balanceSheetDifference`) |
| Filter parse | `lib/finance/reports/report-filter.ts` (`parseBalanceSheetFilter`) |
| Aggregation reuse | `getTrialBalance` — single source for debit/credit totals and signed balances |
| API | `GET /api/finance/reports/balance-sheet` |
| UI | `/finance/reports/balance-sheet` |

---

## Input

Query parameters (same convention as Trial Balance / P&amp;L):

| Param | Required | Notes |
|-------|----------|-------|
| `branchId` | Yes | Branch filter |
| `periodKey` | One of period or range | `YYYY-MM` |
| `from` / `to` | One of period or range | Inclusive date range |
| `hideZeroBalances` | No | Passed through to trial balance |

---

## Output

```typescript
{
  filter, period: { branchId, periodKey?, periodId?, periodStatus?, from?, to? },
  assets[], liabilities[], equity[],
  totalAssets, totalLiabilities, totalEquity, totalLiabilitiesAndEquity,
  balanceDifference, isBalanced
}
```

**Balance check:** `totalAssets` vs `totalLiabilities + totalEquity` using `roundMoney`.

When revenue/expense activity exists without a closing entry to equity, the sheet may show **out of balance** — expected until 16G analysis confirms the gap and 16H closing entry is posted.

---

## Rules

- **Read-only** — no mutations to periods, journals, or reconciliation.
- **Posted data only** — journal entries in scope (via trial balance query).
- **No nested transactions** — domain accepts `PrismaClient` or mock tx; no `$transaction`.
- **No retained earnings roll-forward** — equity lines reflect posted equity accounts only.
- **No closing entry creation in this phase** — posting is 16H.

---

## Related phases

| Phase | Scope |
|-------|-------|
| 16A | CoA import |
| 16B | Manual journal |
| 16C | Trial balance |
| 16J | General ledger (done — see [37_FINANCE_CORE_16J_GENERAL_LEDGER.md](./37_FINANCE_CORE_16J_GENERAL_LEDGER.md)) |
| 16E | Profit & loss |
| **16F** | **Balance sheet** |
| 16G | Retained earnings (done — see 34_FINANCE_CORE_16G_RETAINED_EARNINGS.md) |
| 16H | Closing entry (done — see 35_FINANCE_CORE_16H_CLOSING_ENTRY.md) |

---

## Tests

`__tests__/lib/finance/reports/balance-sheet.test.ts` — classification, balance check, closed period read, imbalance reporting, CSV export.
