# ASAD Month-End Closing Workflow

**Status:** Verified (AD / 2026-01)  
**Scope:** Normal monthly close for legal entity **AD** (ASAD) using Finance Core **16H** closing entry — not manual journal (MJV).

Related: [35_FINANCE_CORE_16H_CLOSING_ENTRY.md](./35_FINANCE_CORE_16H_CLOSING_ENTRY.md), [34_FINANCE_CORE_16G_RETAINED_EARNINGS.md](./34_FINANCE_CORE_16G_RETAINED_EARNINGS.md), [33_FINANCE_CORE_16F_BALANCE_SHEET.md](./33_FINANCE_CORE_16F_BALANCE_SHEET.md), [15_FINANCE_PERIODS.md](./15_FINANCE_PERIODS.md)

---

## Summary

Balance Sheet equity matches the auditor report **only after** posting the system-generated **PERIOD_CLOSING_ENTRY** (16H). Before closing, all owner equity accounts (Paid-up Capital `1`, Legal Reserve `101`, Retained Earnings `301`) are present on the Balance Sheet, but account `301` still reflects **posted** retained earnings only — current-period P&amp;L remains in open revenue/expense accounts.

| Stage | Equity total (AD 2026-01) | BS balanced? |
|-------|---------------------------|--------------|
| Before 16H closing entry | 4,136,769.07 | No (−22,322.02) |
| After 16H closing entry | 4,114,447.05 | Yes |

Verified P&amp;L net income: **−22,322.02** (matches auditor).

---

## What to use (and what not to use)

| Action | Correct tool | Do **not** use |
|--------|--------------|----------------|
| Roll P&amp;L into retained earnings | **16H Closing Entry** (`PERIOD_CLOSING_ENTRY`) | MJV |
| Migration / rounding adjustments only | MJV (`MANUAL_JOURNAL`) | Closing entry |
| Explain pre-close BS gap | **16G Retained Earnings** report | — |
| Lock period after close | **SOFT close** (then HARD close when snapshot gate passes) | — |

---

## Month-end sequence (repeat each period)

### 1. Confirm P&amp;L

- Report: **Profit &amp; Loss** (`/finance/reports/profit-loss`)
- Scope: `legalEntityCode = AD`, `periodKey = YYYY-MM`
- Confirm net income/loss matches auditor / parallel-run expectation.

**AD 2026-01 result:** −22,322.02 ✓

### 2. Preview closing entry (16H)

- UI: **Finance → Accounting Periods** → select period → **Closing entry** (`/finance/periods/[periodId]/closing-entry`)
- API: `GET /api/finance/periods/[id]/closing-entry/preview`

Confirm:

- `simulation.isRequired = true` (P&amp;L activity exists)
- `simulation.isBalanced = true`
- `simulation.netIncome` matches P&amp;L net income
- One line on account **`301`** with reason `TRANSFER_NET_LOSS_TO_RE` (loss) or `TRANSFER_NET_INCOME_TO_RE` (profit)
- Revenue/expense lines use `CLOSE_REVENUE` / `CLOSE_EXPENSE`

**AD 2026-01 preview:** 13 lines (1 revenue + 11 expense + 301 debit 22,322.02) ✓

### 3. Post closing entry

- UI: **Finance → Accounting Periods** → select period → **Post closing entry** (period must be `OPEN`)
- API: `POST /api/finance/periods/[id]/closing-entry` (period admin)

Posted voucher characteristics:

| Field | Value |
|-------|-------|
| `refType` | `PERIOD_CLOSING_ENTRY` |
| `refNo` | `CE-{periodKey}` (e.g. `CE-2026-01`) |
| Posting date | Last calendar day of `periodKey` |

**AD 2026-01 posted:** `V-2026-01-00021`, `refType = PERIOD_CLOSING_ENTRY` ✓

### 4. SOFT close the period

- UI: **Finance → Accounting Periods** → **Soft close**
- API: `PATCH /api/finance/periods` with `action: "SOFT_CLOSE"`

Post closing entry **before** soft close while the period is still `OPEN`. After soft close, new postings to the period are blocked.

**AD 2026-01:** `OPEN` → `SOFT_CLOSED` ✓

### 5. Verify Balance Sheet

- Report: **Balance Sheet** (`/finance/reports/balance-sheet`)
- Scope: `legalEntityCode = AD`, same `periodKey`

Confirm:

- `isBalanced = true`
- Account `301` includes current-period P&amp;L
- Total equity matches auditor

**AD 2026-01 after close:**

| Line | Amount |
|------|--------|
| Paid-up Capital (`1`) | 2,000,000.00 |
| Legal Reserve (`101`) | 200,000.00 |
| Retained Earnings (`301`) | 1,914,447.05 |
| **Total equity** | **4,114,447.05** |
| Balance difference | 0.00 |

### 6. (Optional) HARD close

When reconciliation snapshot and close-readiness checklist pass:

- Capture frozen reconciliation snapshot for the period
- **HARD close** via periods API (`action: "HARD_CLOSE"`)
- See [22_FINANCE_CLOSE_GATE.md](./22_FINANCE_CLOSE_GATE.md)

Closing entry checklist item `closing-entry-present` must be **PASS** before HARD close.

---

## Verification script

Automated check (dry run or execute):

```bash
# Dry run — preview + report only
npx tsx scripts/finance/verify-asad-month-end-closing.ts --entity=AD --period=2026-01

# Execute — post 16H closing entry + SOFT close (when preview passes)
npx tsx scripts/finance/verify-asad-month-end-closing.ts --entity=AD --period=2026-01 --execute
```

Equity diagnostic (pre-close investigation):

```bash
npx tsx scripts/finance/debug-balance-sheet-equity.ts --entity=AD --period=2026-01
```

---

## Reopen policy reminder

- **SOFT → OPEN:** Blocked while an active closing entry exists — reverse the closing entry via **MJV reversal** (16B) first.
- See [25_FINANCE_REOPEN_CONTROL.md](./25_FINANCE_REOPEN_CONTROL.md).

---

## Verified evidence (AD / 2026-01)

| Check | Result |
|-------|--------|
| P&amp;L net income | −22,322.02 |
| Closing preview balanced | Yes |
| 301 transfer (loss debit) | 22,322.02 |
| Voucher `refType` | `PERIOD_CLOSING_ENTRY` |
| BS equity after close | 4,114,447.05 |
| BS balanced after close | Yes |
