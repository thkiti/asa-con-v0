# Finance Reconciliation (Phase 16)

Status: **Done** — read-only aggregate dashboard, variance workflow, CSV export  
Scope: Operational vs GL visibility UI; no accounting mutations  
Related: [17_RECONCILIATION_DRILLDOWN.md](./17_RECONCILIATION_DRILLDOWN.md), [12_FINANCE_RECONCILIATION_AND_CLOSE_POLICY.md](./12_FINANCE_RECONCILIATION_AND_CLOSE_POLICY.md), [15_FINANCE_PERIODS.md](./15_FINANCE_PERIODS.md)

---

## 1. Purpose

Reconciliation provides **operational visibility** into whether committed operational totals (stock valuation, POS revenue, tender) align with derived GL balances over a filter scope.

| Goal | Description |
|------|-------------|
| Aggregate comparison | Inventory and sales/tender vs GL in one dashboard |
| Variance workflow | Status badges, filters, detail panel entry point |
| Read-only exports | Client-side CSV of visible dashboard rows |
| Drill-down entry | Row click opens detail panel (Phase 17 loads transaction issues) |

**Non-goals:** posting, auto-adjust, period mutations, or posting-lock bypass.

---

## 2. Aggregate APIs (Phase 16)

| Endpoint | Kernel | Purpose |
|----------|--------|---------|
| `GET /api/finance/reconciliation/inventory` | `reconcileInventory` | Stock valuation vs inventory GL |
| `GET /api/finance/reconciliation/sales` | `reconcileSalesAndTender` | Revenue and tender vs GL |

Shared query params: `branchId`, `from`, `to` (parsed by `parse-finance-filter.ts`).

Transaction-level issues are **Phase 17**: `GET /api/finance/reconciliation/issues` — see [17_RECONCILIATION_DRILLDOWN.md](./17_RECONCILIATION_DRILLDOWN.md).

---

## 3. Dashboard UI

| Route | Component |
|-------|-----------|
| `/finance/reconciliation` | [`ReconciliationPage.tsx`](../components/finance/ReconciliationPage.tsx) |

Supporting components:

- [`ReconciliationDashboardTable.tsx`](../components/finance/ReconciliationDashboardTable.tsx) — sortable aggregate rows
- [`ReconciliationStatusBadge.tsx`](../components/finance/ReconciliationStatusBadge.tsx) — `MATCHED`, `VARIANCE`, `MISSING_SOURCE`, `MISSING_GL`
- [`VarianceDetailPanel.tsx`](../components/finance/VarianceDetailPanel.tsx) — aggregate detail; nested issues via Phase 17

Fetchers: [`fetchReconciliationDashboard`](../lib/finance-ui/fetchers.ts) (parallel inventory + sales).

### Status model

| Status | Meaning (aggregate row) |
|--------|-------------------------|
| `MATCHED` | Operational and GL amounts align within tolerance |
| `VARIANCE` | Non-zero variance between operational and GL |
| `MISSING_SOURCE` | GL present, operational signal weak/missing |
| `MISSING_GL` | Operational present, GL signal weak/missing |

Client-side filters: category (`inventory` / `revenue` / `tender`), variance status, branch, period key, date range.

---

## 4. Drill-down (Phase 17)

Clicking a variance row opens `VarianceDetailPanel` and loads transaction issues:

1. **Click variance row** → `ReconciliationPage` sets `selectedRow`
2. **`VarianceDetailPanel`** shows aggregate amounts and explanation
3. **`fetchReconciliationIssues`** → `GET /api/finance/reconciliation/issues` with row `domain` + applied scope
4. **`ReconciliationIssuesTable`** shows per-document issues (read-only)

Full API filters, UI sequence, and read-only guarantees: [17_RECONCILIATION_DRILLDOWN.md](./17_RECONCILIATION_DRILLDOWN.md).

---

## 5. Read-only guarantees

| Guarantee | Phase 16 | Phase 17 (drill-down) |
|-----------|----------|------------------------|
| No posting | Aggregate GET only | Issues GET only |
| No fix/reconcile UI | Yes | Yes |
| No voucher/journal mutation | N/A (aggregate) | Enrichment reads only |
| No stock/sale/period mutation | Yes | Yes |
| No posting lock bypass | Yes | Yes |
| CSV export read-only | Dashboard CSV in browser | Issues CSV in browser |

Kernel `runFinanceReconciliation` is used by the issues API but **not changed** in Phase 17.

---

## 6. Manual verification

1. Open `/finance/reconciliation`.
2. Apply filters — aggregate rows and summary cards load.
3. Click a variance row — detail panel opens; transaction issues load (Phase 17).
4. Confirm no post/fix/reconcile buttons.
5. Export dashboard CSV and issues CSV — downloads only, no mutation APIs.
6. Network tab: only `GET` to `/inventory`, `/sales`, and `/issues`.

---

## 7. Future enhancements

| Item | Notes |
|------|-------|
| Deep links to sale/stock document UI | When routes exist |
| Branch name resolution | Replace raw branch IDs |
| Tender-specific kernel issue types | Separate approved phase |
| Scheduled reconciliation snapshots | Read-only history |

All future work stays read-only with **no GL write-back**.
