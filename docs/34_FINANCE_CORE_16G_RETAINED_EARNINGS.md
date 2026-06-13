# Finance Core 16G — Retained Earnings

**Status:** Done  
**Scope:** Read-only retained earnings analysis before posting a closing entry (16H).

Explains economic equity when revenue and expense accounts remain open. **No journal creation, no posting, no closing entry.**

---

## Purpose

When 16F balance sheet shows **out of balance** because P&L is unclosed, 16G bridges:

```
Posted Retained Earnings (account 301, in scope)
+ Current Period Net Income
= Adjusted Retained Earnings
```

And total economic equity:

```
Posted Total Equity (balance sheet)
+ Current Period Net Income
= Adjusted Total Equity
```

When ready to post, proceed to **16H** closing entry — see [35_FINANCE_CORE_16H_CLOSING_ENTRY.md](./35_FINANCE_CORE_16H_CLOSING_ENTRY.md).

### Finance Core chain

**16F** balance sheet → **16G** (this doc) → **16H** closing entry posting.

---

## Architecture

| Layer | Module |
|-------|--------|
| Domain | `lib/finance/reports/retained-earnings.ts` |
| Types | `lib/finance/reports/retained-earnings-types.ts` |
| Filter parse | `lib/finance/reports/report-filter.ts` (`parseRetainedEarningsFilter`) |
| Composition | `getBalanceSheet` + `getProfitLoss` — single accounting engine |
| RE account | Code **`301` only** (legacy ASAD / opening package) |
| API | `GET /api/finance/reports/retained-earnings` |
| UI | `/finance/reports/retained-earnings` |

`// TODO(finance-core): configurable retained earnings account mapping` — deferred; v1 uses code `301` only.

---

## Input

Same convention as Trial Balance / P&amp;L / Balance Sheet:

| Param | Required | Notes |
|-------|----------|-------|
| `branchId` | Yes | Branch filter |
| `periodKey` | One of period or range | `YYYY-MM` |
| `from` / `to` | One of period or range | Inclusive date range |

---

## Output

```typescript
{
  filter, period,
  retainedEarningsAccounts[], otherEquityAccounts[],
  postedRetainedEarnings, otherEquityTotal, postedTotalEquity,
  currentNetIncome, adjustedRetainedEarnings, adjustedTotalEquity,
  totalAssets, totalLiabilities, balanceSheetDifference,
  unclosedEarningsGap, isUnclosedEarningsExplained, isEconomicallyBalanced,
  warnings[]
}
```

**Reconciliation:** `unclosedEarningsGap = balanceSheetDifference − currentNetIncome`. Zero when imbalance is fully explained by open P&L.

**Economic balance:** `totalAssets = totalLiabilities + adjustedTotalEquity`.

---

## Rules

- **Read-only** — no mutations.
- **Account 301 only** — no name/code heuristics in v1.
- **Posted data only** — same journal scope as 16C–16F.
- **No closing entry posting in this phase** — posting is 16H.

---

## Related phases

| Phase | Scope |
|-------|-------|
| 16F | Balance sheet |
| **16G** | **Retained earnings analysis** |
| 16H | Closing entry (done — see 35_FINANCE_CORE_16H_CLOSING_ENTRY.md) |

---

## Tests

`__tests__/lib/finance/reports/retained-earnings.test.ts` — code 301 identification, RE bridge, P&amp;L cross-check, economic balance, loss/negative RE, warnings, CSV.
