# M1.5 — ASAD Inventory Valuation Recovery

**Source:** `O:/คุณกิติ/stock2025/Stock-2025-ASAD.xlsx`  
**Sheet:** `Cost12`  
**GL target:** 2,007,766.55 (FinReport TB 13xx, 31/12/2025)  
**Output:** `data/migration/combined/asad_inventory_valuation_recovery.csv`

---

## Report Classification

| Attribute | Assessment |
|-----------|------------|
| Type | **Inventory Cost Ledger / Valuation Report** |
| Period | December 2568 (year-end close) |
| Structure | Product lines + GL category subtotals + grand total |
| Confidence | **HIGH** |

Not a stock card; not a quantity-only Ending sheet. Contains **December ENDING BALANCE QTY + AMT** per product and per GL inventory category.

---

## Recovery Statistics

| Metric | Value |
|--------|-------|
| Product rows (qty or amt > 0) | **69** |
| Product ending qty total | **55,086** |
| Product ending amount total | **1,585,382.30** |
| Category subtotal rows (1301–1304) | **4** (first occurrence) |
| Subtotal amount sum | **1,585,382.29** |
| Grand total (`ยอดรวมทั้งสิ้น`) | **1,585,382.28** |

### Category subtotals (GL bridge)

| Code | Name | Ending Qty | Ending AMT | GL TB debit | Match |
|------|------|------------|------------|-------------|-------|
| 1301 | ยอดรวมเครื่องจักรและอุปกรณ์ | 9 | 324,252.50 | 324,252.50 | ✅ |
| 1302 | ยอดรวมลูกกุญแจ | 23,595 | 269,409.19 | 269,409.19 | ✅ |
| 1303 | ยอดรวมวัสดุรองเท้า | 31,474 | 923,147.86 | 921,940.13 | ⚠️ +1,207.73 |
| 1304 | ยอดรวมแม่กุญแจ | 8 | 68,572.74 | 68,572.74 | ✅ |

### GL account not in Stock-2025

| Code | Name | GL TB debit | In Stock-2025? |
|------|------|-------------|----------------|
| **1311** | สินค้าระหว่างทาง | **423,591.99** | **No** |

---

## GL Bridge

| Bridge method | Recovered | vs GL | Status |
|---------------|-----------|-------|--------|
| Product detail only | 1,585,382.30 | Short 422,384.25 (21%) | FAIL |
| Category subtotals 1301–1304 | 1,585,382.29 | Short 422,384.26 (21%) | FAIL |
| **Subtotals + GL 1311** | **2,008,974.28** | **Over 1,207.73 (0.06%)** | **WARNING** |

The 422K shortfall without 1311 ≈ GL 1311 in-transit (423,591.99). In-transit inventory is on the balance sheet but outside the stock cost ledger.

---

## Subtotal / Exclude Rules

| Row type | Examples | excludeFromImport |
|----------|----------|-------------------|
| SUBTOTAL | 1301–1304 `ยอดรวม...` | **true** |
| GRAND_TOTAL | `ยอดรวมทั้งสิ้น` | **true** |
| PRODUCT | 1019018, 51030031, etc. | **false** |

Importing subtotals with product lines would double-count — product detail sum equals subtotal sum.

---

## Qty Validation vs M1 Ending

Stock-2025 December ending qty **matches** `ASAD_Inventory202512.xls` / Ending for product codes tested (e.g. 1019018: **6,182** both sources). Quantity source-of-truth remains **Ending**; valuation source-of-truth is now **Stock-2025**.

---

## Sample Product Rows

| Code | Name | Ending Qty | Ending AMT |
|------|------|------------|------------|
| 1019018 | กุญแจบ้าน(เล็ก)ธรรมดาของใน | 6,182 | 46,365.00 |
| 51030031 | LUXE TOPLIFT # XL | 4,632 | 43,865.04 |
| 51030061 | BI-COMPONENT # M,L | 2,681 | 29,142.47 |

Full extract: `asad_inventory_valuation_recovery.csv`

---

## M1 vs M1.5 Comparison

| Source | Valuation | Coverage |
|--------|-----------|----------|
| M1 SetPrice on Ending | 438,604.93 | 21.8% of GL |
| M1.5 Stock-2025 products | 1,585,382.30 | 79.0% of GL |
| M1.5 + GL 1311 | 2,008,974.28 | 100.06% of GL |

---

## Recommendation

**Source-of-truth for M2 opening stock value:** `Stock-2025-ASAD.xlsx` product rows (AMT col 10).

**Additional GL line:** Import 1311 from FinReport TB separately — not from stock file.

**Status:** GO WITH CONDITIONS — resolve 1303 variance (1,207.73) with accountant before import.
