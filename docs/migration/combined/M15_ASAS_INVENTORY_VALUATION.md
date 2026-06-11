# M1.5 — ASAS Inventory Valuation Recovery

**Source:** `O:/คุณกิติ/stock2025/Stock-2025-ASAS.xlsx`  
**Sheet:** `Cost (ด.12)`  
**GL target:** 2,268,125.31 (FinReport TB 13xx, 31/12/2025)  
**Output:** `data/migration/combined/asas_inventory_valuation_recovery.csv`

---

## Report Classification

| Attribute | Assessment |
|-----------|------------|
| Type | **Inventory Cost Ledger** (voucher-level movements + running balance) |
| Period | December 2568 |
| Footer confirmation | Row 1686: **"ยอดคงเหลือเท่ากับในงบการเงิน"** |
| Confidence | **HIGH** |

---

## Link to Legacy Inventory File

| Comparison | Result |
|------------|--------|
| `ASAS_Inventory202512.xls` / Cost (ด.12) vs Stock-2025-ASAS | **76.8%** row match (cols 0–7) |
| Row counts | 1,711 vs 1,710 |
| Assessment | **Same report family** — Stock-2025 is authoritative standalone copy |

Cost (ด.12) in the legacy inventory workbook **can be linked** to Stock-2025-ASAS with **HIGH** confidence for structure and movement data; use Stock-2025 for the signed-off year-end total.

---

## Recovery Statistics

| Metric | Value |
|--------|-------|
| Product codes with ending balance (last running line) | **61** |
| Category subtotal rows | **4** (1302, 1303, 1305, 1306) |
| Grand total (`สรุปยอดรวม` / `ยอดรวมทั้งสิ้น`) | **2,268,125.31** |

### Category subtotals — exact GL match

| Code | Name | Ending Qty | Ending AMT | GL TB | Match |
|------|------|------------|------------|-------|-------|
| 1302 | ยอดรวมลูกกุญแจ | 52,451 | 957,277.27 | 957,277.27 | ✅ |
| 1303 | ยอดรวมวัสดุรองเท้า | 4,944 | 1,292,601.54 | 1,292,601.54 | ✅ |
| 1305 | ยอดรวมเบ็ดเตล็ด | 53 | 212.00 | 212.00 | ✅ |
| 1306 | ยอดรวมวัสดุสิ้นเปลือง | 9,200 | 18,034.50 | 18,034.50 | ✅ |
| **Total** | | **66,648** | **2,268,125.31** | **2,268,125.31** | ✅ |

---

## GL Bridge

| Bridge method | Recovered | vs GL | Status |
|---------------|-----------|-------|--------|
| Category subtotals | 2,268,125.31 | 0.00 | **PASS** |
| Grand total row (1686) | 2,268,125.31 | 0.00 | **PASS** |
| Product last-running-balance sum | ~2,535,628 | +267,502 | FAIL — do not use |

**Important:** Per-product running balances in the movement ledger **do not sum to GL** (multi-layer cost pools). Use **category subtotals or grand total** for valuation import.

---

## Product vs Ending Qty Note

| Code | Stock-2025 last running qty | Ending sheet qty | Note |
|------|----------------------------|------------------|------|
| 1019018 | 105 | 1,236 | Different views — cost ledger layer vs physical Ending |

**Quantity import:** `ASAS_Inventory202512.xls` / Ending  
**Valuation import:** Stock-2025 category subtotals or GL-matched grand total

---

## Subtotal / Exclude Rules

| Row type | excludeFromImport |
|----------|-------------------|
| SUBTOTAL (1302, 1303, 1305, 1306) | **true** for SKU import; **use for GL bridge** |
| GRAND_TOTAL (rows 1675, 1686) | **true** |
| PRODUCT (movement last line) | false for cost reference; **not for GL total** |

---

## M1 vs M1.5 Comparison

| Source | Valuation | Coverage |
|--------|-----------|----------|
| M1 SetPrice on Ending | 0.00 | 0% |
| M1.5 Stock-2025 grand total | 2,268,125.31 | **100%** |

---

## Recommendation

**Source-of-truth for M2 opening stock value:** `Stock-2025-ASAS.xlsx` — category subtotals (cols 17–19 / 22–23) or grand total row 1686.

**Status:** **GO WITH CONDITIONS** — import valuation at category level; qty from Ending; do not sum product running balances.
