# P1 — Posting & Stock Validation Report

**Date:** 2026-06-08  
**Status:** **PASS**  
**Repo:** `D:/_projects/asa-con-v0`  
**Node:** v22.22.0  
**Mode:** Validation + test/doc hardening — **no production orchestrator changes**

---

## Summary

P1 end-to-end validation **passed**. Existing sale and refund flows behave as designed:

```
Sale → issueStock (TRACKED) → inventory balance → postSaleVoucher (POS_SALE) → reconciliation
Refund → money-only (AD001) → postRefundVoucher (POS_REFUND) → reconciliation
```

Refund does **not** call `receiveStock` or create `StockTransaction`. Physical returns remain a separate Stock Document workflow.

**Evidence:** [P1C_REFUND_E2E_VALIDATION.md](./P1C_REFUND_E2E_VALIDATION.md) (refund path) · this report (sale path + combined sign-off)

---

## AD001 — Refund semantics (source of truth)

Per [99_ASA_HANDBOOK.md](./99_ASA_HANDBOOK.md) AD001:

| Refund does | Refund does not |
|-------------|-----------------|
| Create `Refund` row | Create `StockTransaction` |
| Post `POS_REFUND` voucher | Call `receiveStock()` |
| Participate in reconciliation / traceability | Reverse inventory or COGS |

---

## Phase 1 — Automated tests (sale chain)

**New:** `__tests__/lib/pos/p1-sale-posting-chain.test.ts`

| Scenario | Status |
|----------|--------|
| TRACKED sale deducts stock (`beforeQty`/`afterQty`, `POS_SALE` ref) | **PASS** |
| Finance on → `postSaleVoucher` with COGS from `unitCost` | **PASS** |
| CONSUMABLE skips ledger when finance on | **PASS** |
| Finance `PERIOD_CLOSED` rolls back sale + ledger rows | **PASS** |

**Hardened (finance-env isolation):**

- `__tests__/lib/pos/checkout.test.ts` — mocks `isFinancePostingEnabled` / `postSaleVoucher`
- `__tests__/lib/stock/posting/posting.test.ts` — mocks finance hook (mirror `posting-wiring.test.ts`)

---

## Phase 2 — Targeted Jest with `FINANCE_POSTING_ENABLED=true`

```powershell
cd D:/_projects/asa-con-v0
$env:FINANCE_POSTING_ENABLED = "true"
npm test -- `
  __tests__/lib/pos/p1-sale-posting-chain.test.ts `
  __tests__/lib/pos/checkout-wiring.test.ts `
  __tests__/lib/pos/checkout.test.ts `
  __tests__/lib/pos/refund-wiring.test.ts `
  __tests__/lib/pos/refund.test.ts `
  __tests__/lib/finance/posting.test.ts `
  __tests__/lib/finance/reconciliation.test.ts `
  __tests__/lib/finance-ui/traceability.test.ts `
  __tests__/lib/stock/posting/posting.test.ts
Remove-Item Env:FINANCE_POSTING_ENABLED -ErrorAction SilentlyContinue
```

**Result: PASS — 9 suites, 77 tests, exit 0**

(Finance-on full `npm test` no longer breaks checkout/posting suites — P1C follow-up resolved.)

---

## Phase 3 — Full test suite

```powershell
npm test
```

**Result: PASS — 348 suites, 2023 tests, exit 0**

---

## Phase 4 — Build

```powershell
npm run build
```

**Result: PASS — exit 0**

---

## Phase 5 — Architecture audits

```powershell
npm run audit:all
```

**Result: PASS — 13/13**

Ledger caller allowlist confirms refund path does not write stock.

---

## Phase 6 — Live DB smoke (sale)

```powershell
FINANCE_POSTING_ENABLED=true npx tsx scripts/smoke-finance-integration.ts
```

**Result: PASS — 17/17**

| Check | Result | Detail |
|-------|--------|--------|
| OPEN checkout + voucher | **PASS** | sales+1 vouchers+1 |
| Stock decremented | **PASS** | qty 100→99 |
| `StockTransaction` `POS_SALE` | **PASS** | rows=1 qtyOut=1 |
| `POS_SALE` voucher | **PASS** | `V-2026-06-00007` |
| Reconciliation clean for sale | **PASS** | saleIssues=0 |
| SOFT_CLOSED blocks checkout | **PASS** | `PERIOD_CLOSED`, salesDelta=0 |
| HARD_CLOSED blocks checkout | **PASS** | `PERIOD_CLOSED` |

**Smoke seed note:** `SMOKE01` branch reactivation + `setSellingPrice` added to smoke seed when dev data is stale (script only).

**Refund live smoke:** see [P1C_REFUND_E2E_VALIDATION.md](./P1C_REFUND_E2E_VALIDATION.md) Phase 3 (11/11 PASS).

---

## Evidence checklist

| # | Assertion | Automated | Live smoke | Overall |
|---|-----------|-----------|------------|---------|
| 1 | Sale deducts TRACKED stock | **PASS** | **PASS** | **PASS** |
| 2 | CONSUMABLE skips ledger with reason | **PASS** | — | **PASS** |
| 3 | Sale `POS_SALE` voucher | **PASS** | **PASS** | **PASS** |
| 4 | Sale reconciliation zero issues | **PASS** | **PASS** | **PASS** |
| 5 | Period close blocks sale posting | **PASS** | **PASS** | **PASS** |
| 6 | Refund money-only (no stock) | **PASS** (P1C) | **PASS** (P1C) | **PASS** |
| 7 | Refund `POS_REFUND` voucher | **PASS** (P1C) | **PASS** (P1C) | **PASS** |
| 8 | Refund reconciliation / traceability | **PASS** (P1C) | **PASS** (P1C) | **PASS** |
| 9 | Build + audits | **PASS** | — | **PASS** |

---

## Files changed (P1 work)

| File | Change |
|------|--------|
| `__tests__/lib/pos/p1-sale-posting-chain.test.ts` | **New** — sale posting chain tests |
| `__tests__/lib/pos/checkout.test.ts` | Finance mock hardening |
| `__tests__/lib/stock/posting/posting.test.ts` | Finance mock hardening |
| `scripts/smoke-finance-integration.ts` | P1 sale assertions + resilient dev seed |
| `docs/P1_POSTING_STOCK_VALIDATION.md` | **New** — this report |
| `docs/POS_COMPLETION_ROADMAP.md` | P1 wording (AD001), checklist |
| `docs/99_ASA_HANDBOOK.md` | Cross-link sale E2E coverage |

**Production code (`lib/pos/*`, `lib/finance/*`, schema): unchanged** — no defects found.

---

## Deferred to P2–P4

| Item | Phase |
|------|-------|
| `lib/thermal/` unified kernel, `ThermalDocumentLayout` | P2 |
| REFUND layout inheritance from RECEIPT | P2 |
| READ_Z operational slip (counts, discounts, shop validation) | P3 |
| Repair workflow production decision | P4 |
| `STOCK_SLIP`, `WORK_TIME` thermal | Deferred |
| `receiveStock` on refund | **Rejected** (AD001) |

---

## P1 complete

All validation phases passed. No posting/stock defects found in sale or refund paths.

**Sign-off: PASS**
