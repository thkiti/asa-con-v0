# ASAD vs ASAS — Inventory Cross-Reconciliation

**Project:** asa-con-v0  
**Date:** 2026-06-11  
**Scope:** Discovery + M1 candidates only — no import

**Entities:**
- **ASAD** — บริษัท อาสา ดิสทริบิวชั่น (ประเทศไทย) จำกัด
- **ASAS** — บริษัท อาสา เซอร์วิส (ประเทศไทย) จำกัด

**Outputs:**
- `data/migration/combined/asad_asas_inventory_reconciliation.csv`
- `data/migration/combined/asad_asas_product_overlap.csv`
- `data/migration/combined/asad_asas_stock_value_bridge.csv`

---

## Executive Summary

| Question | Answer |
|----------|--------|
| Does ASAS contain missing ASAD valuation detail? | **No** — ASAS has its own GL inventory (2.27M) and zero SetPrice on Ending |
| Is stock combined in any file? | **No** — separate workbooks, separate TB, separate Ending sheets |
| Separate companies or shared pool? | **Separate legal entities** with overlapping product codes but **distinct quantities** |
| Can combined stock reconcile to ASAD GL? | **No** — hypothesis **rejected** |
| ASAS fills ASAD ~1.57M gap? | **No** — ASAS candidate value = 0; pools are independent |

---

## 1. Inventory GL Comparison

| Entity | GL inventory (13xx) | Stock candidate value | Gap | Gap % | Status |
|--------|---------------------|----------------------|-----|-------|--------|
| ASAD | 2,007,766.55 | 438,604.93 | 1,569,161.62 | 78.15% | WARNING |
| ASAS | 2,268,125.31 | 0.00 | 2,268,125.31 | 100.00% | WARNING |
| Group sum | 4,275,891.86 | 438,604.93 | — | — | — |

**Wrong-pool test** (adding ASAS stock to ASAD GL target):

| Measure | Value | vs ASAD GL | Status |
|---------|-------|------------|--------|
| Combined stock candidate | 438,604.93 | Short 1,569,161.62 | **FAIL** |

Source: `asad_asas_stock_value_bridge.csv`

---

## 2. Quantity Comparison

| Metric | ASAD | ASAS |
|--------|------|------|
| Lines qty > 0 | 73 | 30 |
| Total units | 110,172 | 11,138 |
| Shops | 13 | 27 |
| Subtotal rows flagged | 4 (1301–1304) | 2 (1302–1303) |

---

## 3. Product Code Overlap

| overlapType | Count | Meaning |
|-------------|-------|---------|
| BOTH_DISTINCT | 28 | Same code, **different qty** — separate inventory pools |
| BOTH_POSSIBLE_DUPLICATE | 2 | Subtotal rows 1302, 1303 in both — exclude |
| ASAD_ONLY | 43 | Products only in ASAD Ending |
| ASAS_ONLY | 0 | All ASAS products also in ASAD |
| BOTH_SHARED_POOL | 0 | No evidence of shared pool |

### Sample BOTH_DISTINCT rows

| productCode | ASAD qty | ASAS qty | ASAD value | ASAS value |
|-------------|----------|----------|------------|------------|
| 1019018 | 6,182 | 1,236 | — | — |
| 51030031 | 4,632 | 327 | 43,865.04 | — |
| 51030061 | 2,681 | 16 | 29,142.47 | — |
| 55030021 | 1,960 | 312 | — | — |

Full list: `asad_asas_product_overlap.csv` (73 rows)

---

## 4. Mixed Stock Hypothesis Test

**Hypothesis:** ASAD inventory GL gap (~1.57M) is explained by ASAS stock files.

| Step | Result |
|------|--------|
| ASAD gap (GL − stock candidate) | 1,569,161.62 |
| ASAS stock candidate value | 0.00 |
| ASAD + ASAS stock candidate | 438,604.93 |
| Fills gap? | **FAIL** — short by 1,569,161.62 |

**Conclusion:** ASAS does **not** complete ASAD valuation. The gap must be resolved within ASAD sources (Detail Inventory, Cost sheets, accountant allocation) or accepted as control-balance-only.

---

## 5. Subtotal / Double-Count Check

Both entities embed GL-category subtotals in Ending reports:

| Entity | Codes | Name pattern | excludeFromImport |
|--------|-------|--------------|-------------------|
| ASAD | 1301–1304 | ยอดรวม... | true |
| ASAS | 1302–1303 | ยอดรวม... | true |

Importing subtotals **with** detail lines would double-count quantities and corrupt valuation.

---

## 6. Product-Level Import Readiness (combined view)

| Status | ASAD (approx) | ASAS (approx) |
|--------|---------------|---------------|
| READY_TO_IMPORT | 0 | 0 |
| NEEDS_COST | 69 | 28 |
| SUBTOTAL_EXCLUDE | 4 | 2 |
| POSSIBLE_DUPLICATE | 0 | 0 (subtotals flagged separately) |

---

## 7. Reconciliation Checks Summary

| checkName | status |
|-----------|--------|
| ASAD inventory GL | PASS |
| ASAD stock candidate value | WARNING |
| ASAS inventory GL | PASS |
| ASAS stock candidate value | WARNING |
| ASAS fills ASAD gap? | **FAIL** |
| Combined stock explains ASAD GL? | **FAIL** |
| Product overlap count | PASS |
| Separate legal entities | PASS |

Source: `asad_asas_inventory_reconciliation.csv`

---

## 8. Recommended Source-of-Truth (per entity)

| Domain | ASAD | ASAS |
|--------|------|------|
| Inventory qty | ASAD_Inventory202512 / Ending | ASAS_Inventory202512 / Ending |
| Inventory value (target) | FinReport TB 13xx | FinReport TB 13xx |
| Inventory value (candidate) | SetPrice (partial) | Cost (ด.12) — pending M2 |
| GL control | FinReport TB | FinReport TB |

**Never** merge Ending sheets across entities.
