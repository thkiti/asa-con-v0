# ASA-CON Finance Period Filter Standard

Status: **Active project rule (adopt gradually)**  
Scope: All finance pages that filter or scope data by accounting period (`periodKey`).

Related:

- [15_FINANCE_PERIODS.md](./15_FINANCE_PERIODS.md) — period lifecycle and admin workflow
- [ASA_CON_UI_STATUS_NAVIGATION_STANDARD.md](./ASA_CON_UI_STATUS_NAVIGATION_STANDARD.md) — shared UI patterns
- [02_FOLDER_CONVENTIONS.md](./02_FOLDER_CONVENTIONS.md) — shared component locations

---

## 1. Rules

| # | Rule |
|---|------|
| 1 | Period filter must be a **dropdown/select**, not free text |
| 2 | Options come from the **`AccountingPeriod`** table only |
| 3 | Show only periods for the active **`legalEntityCode`** |
| 4 | Sort **descending by `periodKey`** — newest first |
| 5 | Default to the **latest available** period for that entity, unless URL already has a valid `periodKey` |
| 6 | Do **not** show periods that do not exist in `AccountingPeriod` |
| 7 | Preserve `?legalEntityCode=AS\|AD` and `?periodKey=YYYY-MM` in the URL |
| 8 | If no period exists, show empty state: **"No accounting period found for this entity."** |
| 9 | Do **not** auto-create periods from the dropdown |
| 10 | Period creation remains controlled by **Accounting Period workflow / posting logic** |

### Default period selection

“Latest available OPEN/SOFT/HARD period” means: among rows returned for the entity (all normal lifecycle statuses), pick the **highest `periodKey`** after descending sort.

If the URL contains `periodKey` but that key is **not** in the entity’s period list, ignore it and apply the default — do not invent or display phantom periods.

### URL authority

| Query param | Authority |
|-------------|-----------|
| `legalEntityCode` | Tab-safe entity scope (`AS` / `AD`) |
| `periodKey` | Selected accounting period when valid |

Changing the period dropdown updates `periodKey` in the URL via `router.replace` (no full page reload).

---

## 2. Shared implementation

Use these instead of page-specific period text inputs:

| Piece | Location |
|-------|----------|
| Filter logic | `lib/finance-ui/accounting-period-filter.ts` |
| Entity-scoped fetch | `fetchAccountingPeriodsForEntity()` in `lib/finance-ui/period-fetchers.ts` |
| Dropdown UI | `components/finance/AccountingPeriodSelect.tsx` |
| URL + default hook | `lib/finance-ui/use-finance-period-filter.ts` |

### `AccountingPeriodSelect`

- Renders `<select>` with one option per `AccountingPeriod` row
- Option label: `{periodKey} ({status})` — e.g. `2026-01 (OPEN)`
- Disabled while loading or when the period list is empty
- Optional `emptyMessage` prop; default matches rule §8

### `useFinancePeriodFilter`

- Loads periods for `useFinanceLegalEntityScope()`
- Resolves effective `periodKey` (URL → default)
- Syncs URL when default applies
- Returns `{ periodKey, setPeriodKey, periods, loading, hasPeriods }`

---

## 3. API

Period options use:

```
GET /api/finance/periods?legalEntityCode={AS|AD}
```

Scoped via `financeScopedFetch` on the client. The API returns only rows from `AccountingPeriod` for that entity ([`listAccountingPeriods`](../lib/finance/period-list.ts)).

**Do not** use the dropdown POST endpoint or bootstrap helpers from filter UI.

---

## 4. Migration strategy

Do **not** migrate every page at once. Replace `AccountingPeriodInput` when touching a page.

### Priority adopters

| Page / area | Route |
|-------------|-------|
| Bank Cash Journal | `/finance/bank-cash` |
| Bank Statements | `/finance/bank-statements` |
| Bank Reconciliation | `/finance/reconciliation/bank` |
| Cash Reconciliation | `/finance/reconciliation/cash` |
| Operational Reconciliation | `/finance/reconciliation` |
| Finance reports (GL, TB, P&L, BS, etc.) | `/finance/reports/*` |
| Voucher / document inquiry | `/finance/vouchers`, daily-work lists |
| Close readiness / period admin views | `/finance/periods` |

### Keep free-text period input only where

- **Creating** a new accounting period (Accounting Period admin workflow)
- Legacy screens not yet migrated — document exception in PR

### Migration checklist (per page)

1. Replace `AccountingPeriodInput` with `AccountingPeriodSelect`.
2. Wire `useFinancePeriodFilter` (or pass loaded periods + URL sync).
3. Remove `defaultPeriodKey()` / calendar-month fallbacks that bypass `AccountingPeriod`.
4. Show empty state when `hasPeriods === false`.
5. Verify URL preserves both `legalEntityCode` and `periodKey`.
6. Add/update tests for default selection and invalid URL fallback.

---

## 5. Non-goals

- Auto-opening periods from filter screens
- Showing calendar months without an `AccountingPeriod` row
- Cross-entity period lists
- Changing period close/posting logic

---

## 6. Compliance

New finance pages with period filters must use `AccountingPeriodSelect` + entity-scoped period fetch unless an explicit exception is documented in the PR.

When in doubt, **only list what exists in `AccountingPeriod`** for the active entity.
