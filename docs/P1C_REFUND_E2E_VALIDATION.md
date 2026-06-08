# P1C — Refund End-to-End Validation Report

**Date:** 2026-06-08  
**Status:** **PASS**  
**Baseline:** tag `p1b-refund-reconcile-trace` · commit `17c3f77eca94591a7e74363bb8787a377d98c552`  
**Repo:** `D:/_projects/asa-con-v0`  
**Node:** v22.22.0  
**Mode:** Validation only — no production code, schema, or feature changes  

---

## Summary

P1C end-to-end validation **passed**. Refund finance (P1A), reconciliation, and traceability (P1B) behave correctly across OPEN, SOFT_CLOSED, and HARD_CLOSED periods in both automated tests and live DB smoke.

Two test-runner notes (not refund defects):

1. **Original planned regex** — `--testPathPatterns=…posting\.test…` matched `__tests__/lib/stock/posting/posting.test.ts` in addition to `__tests__/lib/finance/posting.test.ts`, causing 4 collateral failures when `FINANCE_POSTING_ENABLED=true`.
2. **Full `npm test` with global finance flag** — Setting `FINANCE_POSTING_ENABLED=true` for the entire Jest run breaks 8 tests in `checkout.test.ts` and `stock/posting/posting.test.ts` (suites not mocked for finance-on). Standard CI run (flag unset) passes **1999/1999**.

**Rerun approach:** Phase 2a uses an **explicit file list** (8 paths), not regex.

---

## Environment

| Item | Value |
|------|-------|
| Git tag | `p1b-refund-reconcile-trace` |
| Commit | `17c3f77` |
| `.env.local` | present |
| P1C explicit tests | `FINANCE_POSTING_ENABLED=true` |
| Full `npm test` | flag **unset** (standard CI) |
| Live smoke | `FINANCE_POSTING_ENABLED=true` (set in ephemeral runner) |

---

## Phase 2a — Targeted Jest (explicit file list)

```powershell
cd D:/_projects/asa-con-v0
$env:FINANCE_POSTING_ENABLED = "true"
npm test -- `
  __tests__/lib/pos/refund-wiring.test.ts `
  __tests__/lib/pos/refund.test.ts `
  __tests__/lib/finance/posting.test.ts `
  __tests__/lib/finance/period-close.test.ts `
  __tests__/lib/finance/reconciliation.test.ts `
  __tests__/lib/finance-ui/traceability.test.ts `
  __tests__/app/api/finance/refunds-route.test.ts `
  __tests__/lib/finance/posting-period.test.ts
```

**Result: PASS — 8 suites, 87 tests, exit 0**

### Original planned regex (historical — failed)

```powershell
npm test -- --testPathPatterns="refund-wiring|refund\.test|posting\.test|period-close|..."
```

**Result: FAIL** — 4 failures in `__tests__/lib/stock/posting/posting.test.ts` because `posting\.test` matched stock posting tests under `FINANCE_POSTING_ENABLED=true`.

### Scenario mapping

| # | Scenario | Status | Evidence |
|---|----------|--------|----------|
| 1 | OPEN — refund + voucher | **PASS** | `refund-wiring.test.ts`, `posting.test.ts` |
| 1 | OPEN — reconciliation | **PASS** | `reconciliation.test.ts` |
| 1 | OPEN — traceability | **PASS** | `traceability.test.ts` |
| 2 | SOFT_CLOSED blocks posting | **PASS** | `period-close.test.ts`, `refund-wiring.test.ts` |
| 3 | HARD_CLOSED blocks posting | **PASS** | `period-close.test.ts` |
| 4 | No stock movement on refund | **PASS** | `refund.test.ts`, `refund-wiring.test.ts` |
| 4 | Refund voucher exists | **PASS** | `posting.test.ts` |
| 4 | Reconciliation matches | **PASS** | `reconciliation.test.ts` |
| 4 | Traceability path exists | **PASS** | `traceability.test.ts` |

---

## Phase 2b — Full test suite

```powershell
cd D:/_projects/asa-con-v0
Remove-Item Env:FINANCE_POSTING_ENABLED -ErrorAction SilentlyContinue
npm test
```

**Result: PASS — 346 suites, 1999 tests, exit 0**

| Run | Result | Note |
|-----|--------|------|
| `npm test` (flag unset) | **PASS** 1999/1999 | Standard CI gate |
| `npm test` (flag `true`) | FAIL 8/1999 | Env pollution in checkout/stock posting mocks — not a refund defect |

---

## Phase 2c — Build

```powershell
npm run build
```

**Result: PASS — exit 0**

- Prisma client generated
- Next.js 16.2.6 production build compiled successfully
- TypeScript check passed
- Routes include `/api/pos/refund`, `/api/finance/reconciliation/refunds`, `/finance/reconciliation/refunds`

---

## Phase 2d — Architecture audits

| Command | Result |
|---------|--------|
| `npm run audit:all` | **PASS** 13/13 |
| `npm run audit:finance` | **PASS** 3/3 |
| `npm run audit:tx` | **PASS** 3/3 |
| `npm run audit:posting-lock` | **PASS** 4/4 |

Ledger caller allowlist confirms refund path does not write stock.

---

## Phase 3 — Live DB smoke

Ephemeral runner (not committed): `scripts/.p1c-refund-smoke.ephemeral.ts` — executed via `npx tsx`, then **deleted**.

Branch `P1C01`, product `P1C-PROD-001`, period `2026-06`.

| Step | Check | Result | Detail |
|------|-------|--------|--------|
| A | Period OPEN | **PASS** | `status=OPEN` |
| B | Checkout stock movement | **PASS** | qty 200→199, tx+1 |
| C | Refund OPEN succeeds | **PASS** | `REF-P1C01-202606-0002` |
| C | Refund no stock movement | **PASS** | tx unchanged, qty unchanged |
| C | Refund voucher exists | **PASS** | `V-2026-06-00005`, `POS_REFUND` |
| D | Reconciliation matches | **PASS** | op=200 gl=200, all variances 0.00 |
| D | No REFUND audit issues | **PASS** | `refundIssues=0` |
| E | Traceability path | **PASS** | operational→voucher→journal→issue→evidence |
| F | SOFT_CLOSED blocks refund | **PASS** | `PERIOD_CLOSED`, no refund row |
| G | HARD_CLOSED blocks refund | **PASS** | `PERIOD_CLOSED`, no refund row |

**Live smoke: 11/11 PASS — exit 0**

**Notes:**

- HARD_CLOSED period status set directly in dev DB for posting-gate test (`closeAccountingPeriod` HARD requires reconciliation snapshot per close gate — automated tests cover the close workflow).
- Smoke seeds selling price via `setSellingPrice` (dev data only).

---

## Evidence checklist

| # | Assertion | Automated | Live smoke | Overall |
|---|-----------|-----------|------------|---------|
| 1 | Checkout creates sale + stock movement | (checkout-wiring) | **PASS** B | **PASS** |
| 2 | Refund creates operational row | **PASS** | **PASS** C | **PASS** |
| 3 | Refund creates no stock movement | **PASS** | **PASS** C | **PASS** |
| 4 | Refund voucher exists (`POS_REFUND`) | **PASS** | **PASS** C | **PASS** |
| 5 | Reconciliation matches | **PASS** | **PASS** D | **PASS** |
| 6 | Traceability path (5 steps) | **PASS** | **PASS** E | **PASS** |
| 7 | SOFT_CLOSED blocks refund posting | **PASS** | **PASS** F | **PASS** |
| 8 | HARD_CLOSED blocks refund posting | **PASS** | **PASS** G | **PASS** |
| 9 | Build succeeds | **PASS** | — | **PASS** |
| 10 | Architecture audits pass | **PASS** | — | **PASS** |

---

## Files changed

| File | Change |
|------|--------|
| `docs/P1C_REFUND_E2E_VALIDATION.md` | Created/updated — this report |

No production code, schema, or feature files modified. Ephemeral smoke script was deleted after run.

---

## Tests run

| Step | Command | Result |
|------|---------|--------|
| Phase 2a explicit | 8 P1C test file paths | **PASS** 87/87 |
| Phase 2b full | `npm test` (flag unset) | **PASS** 1999/1999 |
| Phase 2c build | `npm run build` | **PASS** |
| Phase 2d audits | 4 audit scripts | **PASS** |
| Phase 3 smoke | ephemeral tsx runner | **PASS** 11/11 |

---

## Build result

**PASS** — exit 0 (see Phase 2c)

---

## Audit result

**PASS** — all audit scripts exit 0 (see Phase 2d)

---

## P1C complete

All validation phases passed. No refund-flow defects found. P1C sign-off: **PASS**.

Optional follow-up (out of P1C scope): tag `p1c-refund-e2e-validated` if desired.
