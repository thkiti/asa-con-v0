# M1 — Opening Stock Specification

**Effective date:** 01/01/2026  
**Source:** `ASAD_Inventory202512.xls` → sheet **Ending** (ประจำเดือน ธันวาคม 2568)  
**Output:** `data/migration/m1/opening_stock_candidate.csv`

---

## Objective

Generate opening stock candidate from **observed closing quantities** — no estimation, no invented values.

---

## Source structure

| Sheet | Header row | Key columns |
|-------|------------|-------------|
| Ending | Row 8 | `รหัสสินค้า` (col B), `ชื่อสินค้า` (col C), `จำนวน` (col D) |
| Product Group | Row 1 | Name, unit for group code |
| SetPrice | Row 1 | `ราคาต้นทุน/หน่วย` (col E) — partial coverage |

**Source location recorded in CSV:** `ASAD_Inventory202512.xls/Ending`

---

## Opening stock statistics

| Metric | Value |
|--------|-------|
| Total product codes in Ending | 188 |
| Codes with **qty > 0** | **73** |
| Codes with qty = 0 | 115 (excluded from candidate) |
| Total quantity (qty > 0 rows) | **110,172** units |
| Lines with unit cost from SetPrice | 16 |
| Sum(qty × unitCost) where cost known | **438,604.93** |
| **Valuation coverage vs GL** | **21.85%** |

### Product categories in candidate

| Type | Examples | Count (approx) |
|------|----------|----------------|
| Product groups | 1019018, 61060012, 85050068 | ~69 |
| GL subtotal rows | 1301 ยอดรวมเครื่องจักร, 1302 ยอดรวมลูกกุญแจ | 4 |

**Flag:** Rows **1301–1304** named `ยอดรวม...` are **GL bucket subtotals** in the Ending report, not standard product groups. Included in CSV with source qty as-is; **review before import** to avoid double-counting with detail lines.

---

## Inventory value reference (GL)

FinReport TB inventory accounts (31/12/2025):

| GL code | Name | Debit (THB) |
|---------|------|-------------|
| 1301 | เครื่องจักรและอุปกรณ์ | 324,252.50 |
| 1302 | ลูกกุญแจ | 269,409.19 |
| 1303 | วัสดุรองเท้า | 921,940.13 |
| 1304 | แม่กุญแจ | 68,572.74 |
| 1311 | สินค้าระหว่างทาง | 423,591.99 |
| **Total** | | **2,007,766.55** |

Balance Sheet line **สินค้าคงเหลือ** = 2,007,766.55 (matches).

### Valuation reconciliation

| Measure | Value (THB) | Status |
|---------|-------------|--------|
| Inventory GL target | 2,007,766.55 | Reference |
| Opening stock Σ(qty × unitCost) | 438,604.93 | Partial |
| Difference | 1,569,161.62 | **WARNING** |

**Reason:** SetPrice covers only **16 of 73** product lines. Most key/lock product groups have **qty but no unit cost** in SetPrice. GL value is aggregated by inventory class, not product group.

**M2 action required:** Allocate GL 2,007,766.55 across product groups (by class weights or FIFO report) before finance–stock reconciliation can PASS.

---

## Opening stock document feasibility

| Question | Answer | Confidence |
|----------|--------|------------|
| Can we create opening stock by **quantity**? | **Yes** — 73 lines with explicit qty | **High** |
| Can we create opening stock by **value**? | **Partial** — 21.85% cost coverage | **Low** |
| Default warehouse | **HO** (สำนักงานใหญ่, shop code 0) | **High** |
| SKU-level opening | **No** — Ending is product-group level | **Medium** |

### Proposed opening stock document (M2)

```
Type: RECEIVE (opening balance)
Branch: HO
Date: 2026-01-01
Lines: 69 product-group rows (exclude 1301–1304 subtotals after review)
Qty: from opening_stock_candidate.csv
Unit cost: TBD — requires M2 valuation pass
```

---

## CSV columns

```csv
productCode,productName,qty,unit,unitCost,inventoryValue,sourceSheet,effectiveDate
```

- `inventoryValue` blank where `unitCost` not in SetPrice (not invented)  
- `unit` from Product Group where available

---

## Sample rows (first products with qty)

| Code | Name | Qty | Unit |
|------|------|-----|------|
| 1019018 | กุญแจบ้าน(เล็ก)ธรรมดาของใน | 6,182 | ดอก |
| 1019025 | กุญแจบ้าน(ใหญ่)ธรรมดาของใน | 7,563 | ดอก |
| 1302 | ยอดรวมลูกกุญแจ | 23,595 | — |
| 1303 | ยอดรวมวัสดุรองเท้า | 31,474 | — |

---

## Can we create Opening Stock today?

**Yes for quantity** — candidate CSV ready.  
**Not yet for valued opening** — cost allocation needed before GL reconciliation.

---

## Re-run

```bash
npx tsx scripts/migration/build-m1-transform-package.ts
```
