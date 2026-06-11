# M1 — Reconciliation Plan

**Purpose:** Prove legacy closing → transformed opening package before any import.  
**Output:** `data/migration/m1/reconciliation_summary.csv`  
**Related:** [M1_OPENING_JOURNAL_SPEC.md](./M1_OPENING_JOURNAL_SPEC.md), [M1_OPENING_STOCK_SPEC.md](./M1_OPENING_STOCK_SPEC.md)

---

## Reconciliation checks

| # | Check | Legacy value | Transformed value | Difference | Status |
|---|-------|--------------|-------------------|------------|--------|
| 1 | Trial Balance Debit | 8,295,763.67 | 8,295,763.67 | 0.00 | **PASS** |
| 2 | Trial Balance Credit | 8,295,763.67 | 8,295,763.67 | 0.00 | **PASS** |
| 3 | Opening Journal Debit | 5,010,280.88 | 5,010,280.88 | 0.00 | **PASS** |
| 4 | Opening Journal Credit | 5,010,280.88 | 5,010,280.88 | 0.00 | **PASS** |
| 5 | Balance Sheet Assets | 4,457,414.42 | 4,457,414.42 | 0.00 | **PASS** |
| 6 | BS Liabilities + Equity | 4,457,414.42 | 4,457,414.42 | 0.00 | **PASS** |
| 7 | Inventory GL (TB 13xx) | 2,007,766.55 | 438,604.93* | 1,569,161.62 | **WARNING** |
| 8 | Net Profit 2025 | 759,468.09 | 759,468.09 | 0.00 | **PASS** |
| 9 | Retained Earnings (301 adjusted) | 1,936,769.07 | 1,936,769.07 | 0.00 | **PASS** |

\* Transformed value = Σ(qty × unitCost) from opening stock candidate where SetPrice cost exists (16 lines). Not a final stock valuation.

---

## Check details

### TB check

```
Legacy TB (FinReport 31/12/2025):
  Debit  = 8,295,763.67
  Credit = 8,295,763.67
  Balanced: YES
```

### Opening journal check

```
After P&L close to RE 301:
  Debit  = 5,010,280.88
  Credit = 5,010,280.88
  Balanced: YES
  Lines: 26
```

### Balance sheet check

```
Assets:                4,457,414.42
Liabilities:             320,645.35
Equity:                4,136,769.07
Liabilities + Equity:  4,457,414.42
Balanced: YES
```

### Inventory check

```
GL inventory (1301+1302+1303+1304+1311):  2,007,766.55
Opening stock valuation (partial):        438,604.93
Coverage: 21.85%
Status: WARNING — cost data incomplete
```

**Resolution path (M2):**

1. Map product groups → GL buckets (keys / shoe materials / in-transit)  
2. Apply GL bucket totals as valuation caps  
3. Or import qty-only opening and post GL inventory via opening journal (already in 13xx accounts)

### P&L check

```
FinReport net profit:     759,468.09
TB P&L roll-up (5-9xxx):  759,468.09
Match: YES
```

### Retained earnings check

```
RE 301 original:     1,177,300.98
+ Net profit:          759,468.09
= Adjusted RE:       1,936,769.07
Equity stmt match:   1,936,769.07
```

---

## Post-migration validation (asa-con-v0 reports)

| Report | Legacy reference | When to run |
|--------|------------------|-------------|
| 16C Trial Balance | FinReport TB (adjusted) | After CoA + opening journal import |
| 16E P&L | FinReport P&L (2025 only) | Parallel run period |
| 16F Balance Sheet | FinReport BS | After first close |
| Stock on hand | Ending sheet qty | After opening stock doc |
| Reconciliation dashboard | TB vs stock GL | After both imports |

---

## Migration Readiness Score

| Category | Score | Rationale |
|----------|-------|-----------|
| **Finance** | **98%** | TB balanced; opening journal balanced; 197 CoA mapped; 22 LOW-review accounts |
| **Inventory** | **72%** | Qty candidate ready; valuation 22% coverage; subtotal rows need review |
| **Branches** | **88%** | 13 shops mapped (1 HO + 12 SHOP); file has padding rows not data |
| **Products** | **90%** | 3,676 groups + 995 SKUs in master; opening uses 73 group lines |
| **AR** | **60%** | Control balance in opening journal; no subledger |
| **AP** | **70%** | Control + supplier master; no open bills |
| **Tax** | **20%** | Dec 2025 VAT files missing; Apr 2026 only |

### Overall readiness

| Verdict | **GO WITH CONDITIONS** |
|---------|-------------------------|

**Conditions:**

1. Resolve 19 `REVIEW_REQUIRED` CoA rows (contra assets)  
2. Complete inventory valuation (M2) or accept qty-only stock + GL opening split  
3. Exclude or remap Ending subtotal rows 1301–1304  
4. Obtain AR aging / customer master before subledger go-live  
5. Sign-off on opening journal and stock candidates

---

## Final questions

### 1. Can we create Opening Journal today?

**Yes.** `opening_journal_candidate.csv` — 26 lines, debit = credit = 5,010,280.88.

### 2. Can we create Opening Stock today?

**Yes for quantity** (73 lines, 110,172 units). **Not for full valuation** (21.85% cost coverage).

### 3. Can we go live on 01/01/2026?

**Go with conditions.** Finance opening package is ready. Inventory needs valuation pass. AR/customer subledger not ready.

### 4. What data is still missing?

- AR open-item / aging export  
- Complete customer master (file has 3 rows)  
- Dec 2025 VAT reports (ภาษีขาย/ซื้อ ธ.ค. 2568)  
- Unit cost for all opening product groups  
- Decision on contra-asset import policy

### 5. What risks remain?

| Risk | Severity |
|------|----------|
| Contra-asset import blocked by v0 validator | High |
| Inventory GL vs stock value mismatch | High |
| Ending subtotal rows double-count risk | Medium |
| Equity code `1` vs asset `1001` confusion | Medium |
| No AR subledger | Medium |
| Tax opening position unknown | Medium |

---

## Artifacts

| File | Description |
|------|-------------|
| `data/migration/m1/coa_mapping_candidate.csv` | 197 account mappings |
| `data/migration/m1/opening_journal_candidate.csv` | 26-line balanced opening |
| `data/migration/m1/opening_stock_candidate.csv` | 73 product qty lines |
| `data/migration/m1/branch_mapping_candidate.csv` | 13 branch mappings |
| `data/migration/m1/reconciliation_summary.csv` | 9 check results |
| `data/migration/m1/m1_stats.json` | Machine-readable stats |

## Re-run

```bash
npx tsx scripts/migration/build-m1-transform-package.ts
```
