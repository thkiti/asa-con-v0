# M1 — Chart of Accounts Mapping

**Phase:** M1 (analysis + transform only)  
**Source:** `FinReport-202512.xls` → Trial Balance (31/12/2025)  
**Output:** `data/migration/m1/coa_mapping_candidate.csv`  
**Generated:** 2026-06-11

---

## Summary

| Metric | Count |
|--------|-------|
| **Total accounts mapped** | **197** |
| ASSET | 69 |
| LIABILITY | 30 |
| EQUITY | 5 |
| REVENUE | 5 |
| EXPENSE | 88 |
| Confidence HIGH | 175 |
| Confidence LOW | 22 |
| `REVIEW_REQUIRED` | 19 |
| `EXCLUDE_OPENING` | 87 |
| `STRUCTURAL_ONLY` | 2 |
| `MIGRATE` (incl. zero-balance) | 108 |

**Duplicate account codes:** None detected.

---

## Mapping rules applied

| Code range | Account type | Normal balance | Opening journal |
|------------|--------------|----------------|-----------------|
| 1–999 | EQUITY | CREDIT | Include if non-zero |
| 1xxx–3xxx | ASSET | DEBIT | Include if non-zero |
| 4xxx | LIABILITY | CREDIT | Include if non-zero |
| 5xxx | REVENUE | CREDIT | **Exclude** (close to RE) |
| 6xxx–9xxx | EXPENSE | DEBIT | **Exclude** (close to RE) |

### Special handling (never guessed silently)

| Condition | Action | Confidence |
|-----------|--------|------------|
| ค่าเสื่อมราคาสะสม (226x–228x) | ASSET + CREDIT normal balance → `REVIEW_REQUIRED` | LOW |
| ค่าเผื่อ AR (114x), inventory allowance (1391) | ASSET + CREDIT → `REVIEW_REQUIRED` | LOW |
| Account 5000 (section header) | `STRUCTURAL_ONLY` — not a posting account | LOW |
| 8xxx names containing รายได้ / ดอกเบี้ยรับ | `REVIEW_REQUIRED` — name vs code mismatch | LOW |
| Expense with closing credit balance (6981, 8601) | `EXCLUDE_OPENING` + LOW flag | LOW |
| Equity codes 1, 101, 301, 401 | Mapped as-is (unpadded numeric strings) | HIGH |

### v0 import constraint

asa-con-v0 `gl-account-csv-parser` validates `normalBalance` against `accountType` (ASSET/EXPENSE must be DEBIT). **19 contra-asset accounts** will **block on import** unless:

1. Schema/policy extended for contra assets, or  
2. Accounts reclassified (e.g. map accumulated depreciation as LIABILITY), or  
3. Net PPE posted as single net asset lines (matching BS presentation)

---

## Suspicious / review accounts (22 LOW)

### Contra assets & allowances (14) — `REVIEW_REQUIRED`

| Code | Name | Closing balance |
|------|------|-----------------|
| 1141–1143 | ค่าเผื่อหนี้สงสัยจะสูญ | Zero |
| 1391 | สำรองค่าเผื่อสินค้าล้าสมัย | Zero |
| 2251, 2261–2262, 2271–2273, 2281–2282, 2285–2286 | ค่าเสื่อมราคาสะสม | **552,866.46 Cr** (non-zero: 2261, 2271, 2272) |

### Structural / misclassified (8)

| Code | Name | Issue |
|------|------|-------|
| 5000 | รายได้รวมภาษีมูลค่าเพิ่ม | Section row, not GL |
| 6981 | ค่าใช้จ่ายอื่น ๆ เกี่ยวกับบริหาร | Credit balance 628.09 |
| 8101–8131 | ดอกเบี้ยรับ / รายได้อื่น | Expense code range, income names |
| 8601 | รายได้หรือค่าใช้จ่ายที่ไม่เกี่ยวกับการบริหาร | Credit balance 5.56 |
| 8701 | เงินปันผลรับ | Income name under 8xxx |

---

## Unmapped accounts

**None.** All 197 TB rows have a mapping row in `coa_mapping_candidate.csv`.

---

## Migration status breakdown

| Status | Meaning | Count |
|--------|---------|-------|
| `MIGRATE` | Import to CoA; may appear in opening if non-zero | 108 |
| `EXCLUDE_OPENING` | Import to CoA; excluded from 01/01/2026 opening (P&L) | 87 |
| `REVIEW_REQUIRED` | Mapped but needs human decision before import | 19 |
| `STRUCTURAL_ONLY` | Legacy report structure; optional in CoA | 2 |

---

## Equity accounts (opening-critical)

| Code | Name | Type | Closing credit | Opening note |
|------|------|------|----------------|--------------|
| 1 | ทุนหุ้นสามัญ | EQUITY | 2,000,000.00 | Unchanged |
| 101 | สำรองตามกฎหมาย | EQUITY | 200,000.00 | Unchanged |
| 201 | สำรองอื่น | EQUITY | 0 | Zero |
| 301 | กำไร (ขาดทุน) สะสม | EQUITY | 1,177,300.98 → **1,936,769.07** | **Adjusted** (+759,468.09) |
| 401 | กำไร (ขาดทุน) สุทธิ | EQUITY | 0 | Year-end staging; excluded |

---

## CSV columns

```
sourceCode, sourceName, accountType, normalBalance, isActive, migrationStatus, confidence, notes
```

**Not import-ready** for v0 CSV import until:

- `accountCode` / `accountName` header rename (M2), and  
- `REVIEW_REQUIRED` rows resolved.

---

## Re-run

```bash
npx tsx scripts/migration/build-m1-transform-package.ts
```
