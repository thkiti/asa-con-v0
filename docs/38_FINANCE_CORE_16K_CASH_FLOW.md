# Finance Core 16K — Cash Flow Statement

**Status:** Done  
**Scope:** Read-only indirect cash flow statement composed from existing finance reports.

**Related:** [37_FINANCE_CORE_16J_GENERAL_LEDGER.md](./37_FINANCE_CORE_16J_GENERAL_LEDGER.md) · [36_FINANCE_CORE_16I_CHANGES_IN_EQUITY.md](./36_FINANCE_CORE_16I_CHANGES_IN_EQUITY.md) · [profit-loss / P&amp;L](../lib/finance/reports/profit-loss.ts)

### What 16K is not

| Item | Notes |
|------|-------|
| Direct method | Deferred — indirect only in v1 |
| Schema changes | Account mapping is config in `cash-flow-mapping.ts` |
| Second accounting engine | Composes P&amp;L, GL, Changes in Equity |
| Full legacy CoA | v1 maps operational codes only; pending categories warn |

---

## Purpose

Present an **indirect** cash flow statement for a branch and period/date range:

- **Operating:** net income + working-capital balance changes
- **Investing:** zero until mapped (documented warning)
- **Financing:** equity other changes from changes in equity (excludes closing entry vouchers)
- **Reconciliation:** computed net change vs ledger change in cash &amp; equivalents (`1100`, `1110`)

---

## Architecture

| Layer | Module |
|-------|--------|
| Mapping config | `lib/finance/reports/cash-flow-mapping.ts` |
| Domain | `lib/finance/reports/cash-flow.ts` |
| Types | `lib/finance/reports/cash-flow-types.ts` |
| Filter parse | `lib/finance/reports/report-filter.ts` (`parseCashFlowFilter`) |
| Composition | `getProfitLoss`, `getGeneralLedger`, `getChangesInEquity` |
| API | `GET /api/finance/reports/cash-flow` |
| UI adapter | `lib/finance-ui/cash-flow.ts` |
| UI | `/finance/reports/cash-flow` |

---

## v1 account mappings

| Group | Codes | Role |
|-------|-------|------|
| Cash &amp; equivalents | `1100`, `1110` | Reconciliation target |
| Working capital assets | `1000` | Inventory Δ → operating adjustment |
| Working capital liabilities | `2100` | AP Δ → operating adjustment |

### Pending mappings (warn only — not active in v1)

- Accounts receivable
- Director loan / Due to director
- Interest expense / Interest payable
- Fixed asset
- Depreciation (non-cash add-back)

Extend `PENDING_CASH_FLOW_MAPPINGS` and later promote codes into `CASH_FLOW_V1_MAPPINGS` without schema changes.

---

## Calculation model

1. **Net income** — `getProfitLoss` → `netIncome`
2. **Working capital** — for each mapped WC account, GL opening/closing signed balances:
   - Asset increase → subtract from operating cash (adjustment = −(closing − opening))
   - Liability increase → add to operating cash (adjustment = closing − opening)
3. **Investing** — subtotal `0` with informational line until mapped
4. **Financing** — `OTHER_CHANGES` row from `getChangesInEquity` per equity account
5. **Net change in cash** — sum of section subtotals
6. **Reconciliation** — must equal Δ(cash + equivalents) from GL; `isReconciled` when difference is zero after `roundMoney`

**Date scoping:** same as P&amp;L / GL — calendar month when `periodKey` is used (not trial balance `periodId`).

---

## Warnings

| Code | When |
|------|------|
| `PENDING_MAPPING` | Each documented but unmapped category (always in v1) |
| `UNMAPPED_ACCOUNT_WITH_ACTIVITY` | ASSET/LIABILITY with scope activity not in v1 mapping |
| `CASH_RECONCILIATION_DIFFERENCE` | Computed net change ≠ GL cash change |
| `UNCLOSED_PROFIT_PERIOD` | Propagated from changes in equity when P&amp;L not closed |
| `NO_INVESTING_MAPPED` | Investing section not mapped in v1 |

---

## Rules

- **Read-only** — no mutations
- **Posted data only**
- **No nested `$transaction`**
- **No schema changes in v1**

---

## Tests

| Area | Location |
|------|----------|
| Domain | `__tests__/lib/finance/reports/cash-flow.test.ts` |
| API route | `__tests__/app/api/finance/cash-flow-route.test.ts` |

---

## Future (out of scope)

- Direct method
- Promote pending mappings to active config when real CoA is imported
- Optional persisted CF metadata on `GlAccount` if config maintenance becomes burdensome
- Finance dashboard
