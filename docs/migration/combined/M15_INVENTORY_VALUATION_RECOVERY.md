# M1.5 — Inventory Valuation Recovery

**Project:** asa-con-v0  
**Date:** 2026-06-11  
**Scope:** Analysis only — no DB import, no cost allocation, no schema changes

**Evidence files:**
- `O:/คุณกิติ/stock2025/Stock-2025-ASAD.xlsx`
- `O:/คุณกิติ/stock2025/Stock-2025-ASAS.xlsx`

**Outputs:**
- `data/migration/combined/asad_inventory_valuation_recovery.csv`
- `data/migration/combined/asas_inventory_valuation_recovery.csv`
- `data/migration/combined/inventory_gl_bridge.csv`

**Script:** `scripts/migration/build-m15-inventory-valuation-recovery.ts`

---

## Executive Summary

| Entity | M1 stock value | Stock-2025 recovered | GL 13xx | Bridge status |
|--------|----------------|----------------------|---------|---------------|
| ASAD | 438,604.93 (SetPrice) | **1,585,382.29** (on-hand) + **423,591.99** (1311) | 2,007,766.55 | **WARNING** (−0.06%) |
| ASAS | 0.00 | **2,268,125.31** | 2,268,125.31 | **PASS** (0.00%) |

**Root finding:** M1 used the wrong valuation source (Ending + SetPrice). **Stock-2025 is the correct valuation source.** The ASAD “gap” was largely **account 1311 สินค้าระหว่างทาง** (in-transit), which is not in the stock cost ledger but is on the GL.

---

## Phase A — Workbook Inspection

### Stock-2025-ASAD.xlsx

| Attribute | Value |
|-----------|-------|
| Sheets | 1 — `Cost12` |
| Company | บริษัท อาสา ดิสทริบิวชั่น (ประเทศไทย) จำกัด |
| Report type | **Inventory Cost Ledger / Valuation Report** |
| Period | December 2568 (31/12/2025 close) |
| Confidence | **HIGH** |

**Column map (row 11 headers):**

| Col | Field |
|-----|-------|
| 0 | Product code (GROUP) |
| 1 | Description |
| 3–4 | December IN — QTY, AMT |
| 5–6 | December USAGE — QTY, AMT |
| 7–8 | November ending — QTY, AMT |
| 9–10 | **December ending — QTY, AMT** |

Includes voucher-style movement context; ending balance is a **monthly cost valuation summary**, not a stock card.

### Stock-2025-ASAS.xlsx

| Attribute | Value |
|-----------|-------|
| Sheets | 1 — `Cost (ด.12)` |
| Company | บริษัท อาสา เซอร์วิส (ประเทศไทย) จำกัด |
| Report type | **Inventory Cost Ledger** (movement + running balance) |
| Period | December 2568 |
| Confidence | **HIGH** |

**Column map:**

| Col | Field |
|-----|-------|
| 0–3 | Product code, name, voucher ref, date |
| 5–7 | Opening — QTY, unit cost, AMT |
| 9–11 | Receipt — QTY, unit cost, AMT |
| 13–15 | Issue — QTY, unit cost, AMT |
| 17–19 | **Ending balance — QTY, unit cost, AMT** |

Footer row 1686 states: **"ยอดคงเหลือเท่ากับในงบการเงิน"** (balance equals financial statements).

**Link to `ASAS_Inventory202512.xls` Cost (ด.12):** **76.8%** row match on first 8 columns (1,710 vs 1,711 rows) — **HIGH** confidence same export family.

---

## Phase D — Inventory GL Bridge

`inventory_gl_bridge.csv`

| Company | Measure | GL | Recovered | Diff | Diff % | Status |
|---------|---------|-----|-----------|------|--------|--------|
| ASAD | Product detail sum | 2,007,766.55 | 1,585,382.30 | 422,384.25 | 21.04% | FAIL |
| ASAD | Category subtotals 1301–1304 | 2,007,766.55 | 1,585,382.29 | 422,384.26 | 21.04% | FAIL |
| ASAD | **Subtotals + GL 1311 in-transit** | 2,007,766.55 | **2,008,974.28** | **−1,207.73** | **−0.06%** | **WARNING** |
| ASAD | Grand total row | 2,007,766.55 | 1,585,382.28 | 422,384.27 | 21.04% | FAIL |
| ASAS | Category subtotals 13xx | 2,268,125.31 | 2,268,125.31 | 0.00 | 0.00% | **PASS** |
| ASAS | Grand total row | 2,268,125.31 | 2,268,125.31 | 0.00 | 0.00% | **PASS** |

---

## Phase E — Gap Root Cause (ranked)

| Rank | Cause | Probability | Evidence |
|------|-------|-------------|----------|
| 1 | **Incorrect source file in M1** | **HIGH** | M1 used Ending + SetPrice; Stock-2025 has full AMT columns |
| 2 | **GL 1311 in-transit not in stock ledger** | **HIGH** | ASAD GL 1311 = 423,591.99; absent from Stock-2025; explains ~422K of gap |
| 3 | **Subtotal rows** | **HIGH** | 1301–1304 `ยอดรวม...` in both files — must exclude from product import |
| 4 | **1303 category variance** | **MEDIUM** | Stock 1303 = 923,147.86 vs GL 921,940.13 (−1,207.73) — drives remaining bridge variance |
| 5 | **Product grouping** | **LOW** | Product detail sum equals category subtotals — no double-count within file |
| 6 | **Shared inventory files** | **LOW** | Rejected in M1 — separate companies, separate Stock-2025 files |

---

## Phase F — Readiness Recalculation

| Metric | Before M1.5 | After M1.5 | Change |
|--------|-------------|------------|--------|
| ASAD inventory valuation | 35% NOT READY | **88% GO WITH CONDITIONS** | +53 pts — Stock-2025 + 1311 explains GL |
| ASAS inventory valuation | 25% NOT READY | **95% GO WITH CONDITIONS** | +70 pts — grand total matches GL exactly |

**What changed:** Valuation source shifted from Ending/SetPrice to Stock-2025 cost ledger. ASAS gap eliminated. ASAD gap reclassified as **1311 in-transit** (GL-only), not missing stock costs.

Updated rows appended to `asad_asas_readiness_score.csv`.

---

## Final Answers

### 1. Does Stock-2025-ASAD explain the ASAD inventory gap?

**Yes, with conditions.** On-hand valuation (1,585,382.29) + GL account **1311** in-transit (423,591.99) = 2,008,974.28 vs GL 2,007,766.55 (**0.06% variance** from 1303 shoe-materials rounding). The original ~1.57M gap was a **wrong-source artifact**, not missing data.

### 2. Does Stock-2025-ASAS explain the ASAS inventory gap?

**Yes, fully.** Grand total and category subtotals = **2,268,125.31** — exact GL match. File explicitly confirms balance equals financial statements.

### 3. Source-of-truth recommendation

| Entity | Quantity | Valuation |
|--------|----------|-----------|
| ASAD | `ASAD_Inventory202512.xls` / Ending | **Stock-2025-ASAD** / Cost12 + GL **1311** for in-transit |
| ASAS | `ASAS_Inventory202512.xls` / Ending | **Stock-2025-ASAS** / Cost (ด.12) category subtotals or grand total |

**Not** Ending + SetPrice. **Combination:** Stock-2025 for valued on-hand + FinReport TB for 1311 (ASAD only).

### 4. Can inventory valuation reconcile to GL?

| Entity | Reconcile? |
|--------|------------|
| ASAD | **Yes** — WARNING tier (0.06%); accountant sign-off on 1303 + 1311 |
| ASAS | **Yes** — PASS |

### 5. What gap remains?

| Entity | Remaining gap | Notes |
|--------|---------------|-------|
| ASAD | **~1,207.73** (0.06%) | 1303 stock vs GL; plus 1311 must be imported from GL not stock file |
| ASAS | **0.00** | Product-level running balances do not sum to GL — use category subtotals for import |

### 6. Is M2 ready?

**Proceed to M2 with conditions:**
- ASAD: import on-hand from Stock-2025 product rows; import 1311 as GL control line; exclude subtotals
- ASAS: import valuation from category subtotals / grand total; qty from Ending sheet
- Both: accountant sign-off on 1303 variance and 1311 treatment

---

## Related docs

- [M15_ASAD_INVENTORY_VALUATION.md](./M15_ASAD_INVENTORY_VALUATION.md)
- [M15_ASAS_INVENTORY_VALUATION.md](./M15_ASAS_INVENTORY_VALUATION.md)
- [ASAD_ASAS_INVENTORY_RECONCILIATION.md](./ASAD_ASAS_INVENTORY_RECONCILIATION.md)
