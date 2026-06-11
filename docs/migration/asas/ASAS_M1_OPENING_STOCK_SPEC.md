# ASAS M1 — Opening Stock Specification

**Company:** บริษัท อาสา เซอร์วิส (ประเทศไทย) จำกัด  
**Effective date:** 01/01/2026  
**Source:** `ASAS_Inventory202512.xls` → sheet **Ending** (ประจำเดือน ธันวาคม 2568)  
**Output:** `data/migration/asas/m1/asas_opening_stock_candidate.csv`

---

## Objective

Generate opening stock **quantity** candidate from observed closing balances. **No silent cost estimation.**

---

## Source Structure

| Sheet | Header row | Key columns |
|-------|------------|-------------|
| Ending | Row 8 | `รหัสสินค้า` (B), `ชื่อสินค้า` (C), `จำนวน` (D) |
| Product Group | Row 1 | Unit, group name |
| SetPrice | Row 1 | `ราคาต้นทุน/หน่วย` — **no matches on Ending qty lines** |
| Cost (ด.12) | Movement report | Unit costs present — **not yet joined to Ending** |

**Source location in CSV:** `ASAS_Inventory202512.xls/Ending`

---

## Opening Stock Statistics

| Metric | Value |
|--------|-------|
| Total product codes in Ending | 32 |
| Codes with **qty > 0** | **30** |
| Subtotal rows (excluded) | **2** (1302, 1303) |
| Total quantity (importable) | **11,138** units (excl. subtotals: 5,569) |
| Lines with unit cost | **0** |
| Sum(qty × unitCost) | **0.00** |
| **Valuation coverage vs GL** | **0%** |

### GL inventory target

| GL | Amount (THB) |
|----|--------------|
| 1302 + 1303 + 1305 + 1306 | **2,268,125.31** |
| Stock candidate value | **0.00** |
| Gap | **2,268,125.31** (100%) |

---

## Subtotal / Double-Count Detection

Rows matching GL bucket codes with `ยอดรวม` prefix:

| Code | Name | Qty | Action |
|------|------|-----|--------|
| 1302 | ยอดรวมลูกกุญแจ | 3,927 | `excludeFromImport = true`, `SUBTOTAL_EXCLUDE` |
| 1303 | ยอดรวมวัสดุรองเท้า | 1,642 | `excludeFromImport = true`, `SUBTOTAL_EXCLUDE` |

These mirror ASAD Ending report pattern — they are **category totals**, not SKUs.

---

## Import Readiness Classification

| Status | Count | Meaning |
|--------|-------|---------|
| NEEDS_COST | 28 | Qty known; no unit cost on source |
| SUBTOTAL_EXCLUDE | 2 | Do not import |
| READY_TO_IMPORT | 0 | Requires cost bridge first |

---

## Product Overlap with ASAD

- **28** product codes appear in both ASAD and ASAS with qty > 0.
- Quantities differ (e.g. 1019018: ASAD 6,182 vs ASAS 1,236) → **BOTH_DISTINCT** — separate pools, not duplicates.
- **43** ASAD-only products; **0** ASAS-only (all ASAS products also exist in ASAD).

See: `data/migration/combined/asad_asas_product_overlap.csv`

---

## Valuation Path (M2)

Recommended order:

1. Parse **Cost (ด.12)** for last-known unit cost per product code (Dec movement).
2. Join to Ending qty — mark `sourceValuation = Cost12` vs `allocatedValuation` separately.
3. Reconcile sum to GL 13xx; residual → manual allocation line explicitly flagged.
4. **Do not** use ASAD SetPrice costs for ASAS rows.

---

## Branch Context

ASAS operates **27 shops** (vs ASAD 13). Shop Detail mapped in `asas_branch_mapping_candidate.csv`. Ending sheet reports **consolidated HO stock** (not per-shop breakdown in candidate).

Per-shop qty would require parsing shop-level Ending variants or Data Out net positions — not in current candidate.

---

## Candidate CSV Schema

| Column | Description |
|--------|-------------|
| productCode | Legacy SKU / group code |
| productName | Thai product name |
| qty | Closing quantity |
| unit | From Product Group |
| unitCost | Empty in M1 |
| inventoryValue | Empty in M1 |
| sourceSheet | Provenance |
| excludeFromImport | true for subtotals |
| importReadiness | NEEDS_COST / SUBTOTAL_EXCLUDE |
| confidence | MEDIUM for qty; LOW for subtotals |
| effectiveDate | 2026-01-01 |
