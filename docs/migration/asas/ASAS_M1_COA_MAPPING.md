# ASAS M1 — Chart of Accounts Mapping

**Company:** บริษัท อาสา เซอร์วิส (ประเทศไทย) จำกัด  
**Source:** `FinReport-202512.xls` → Trial Balance  
**Output:** `data/migration/asas/m1/asas_coa_mapping_candidate.csv`  
**Effective date:** 01/01/2026

---

## Summary

| Metric | Value |
|--------|-------|
| Legacy accounts (TB) | **197** |
| Non-zero balance accounts | **92** |
| Accounts in opening journal candidate | **41** (balance sheet only, post P&L close) |
| Revenue accounts (excluded from opening) | Closed into `301` |
| Expense accounts (excluded from opening) | Closed into `301` |
| Retained earnings account | **`301` กำไร (ขาดทุน) สะสม** |

---

## Account Structure (inferred)

Same CoA numbering scheme as ASAD (shared ERP template):

| Range | Type | Examples |
|-------|------|----------|
| 1xx | Equity / reserves | 1 ทุน, 101 สำรอง, 301 กำไรสะสม |
| 10xx | Cash | 1001, 1011, 1021 |
| 11xx | AR | 1101 ลูกหนี้การค้า |
| 13xx | Inventory | 1302, 1303, 1305, 1306 |
| 14xx | Prepaid | 1421, 1431, 1451, 1452 |
| 22xx | Fixed assets | 2211–2236 |
| 22xx (226–228) | Accumulated depreciation | Contra accounts |
| 30xx | Deposits | 3001 |
| 41xx | AP | 4101, 4151 (related party) |
| 45xx–49xx | Accruals / provisions | Payroll, VAT, employee benefits |

---

## P&L Close Rule

Per accounting rules for opening migration:

1. Identify all revenue (4xxx) and expense (5xxx–6xxx) accounts with year-end balances.
2. Compute net profit: **23,494.96 THB** (credit balance on P&L).
3. Close net profit into **`301`**:
   - TB `301` before close: **1,956,275.55**
   - Adjusted `301` for opening: **1,979,770.51**
4. Opening journal includes **only** balance sheet accounts at adjusted `301`.

---

## Inventory Accounts (mapping note)

| Legacy code | Thai name | TB debit | Maps to |
|-------------|-----------|----------|---------|
| 1302 | ลูกกุญแจ | 957,277.27 | Inventory asset — keys |
| 1303 | วัสดุรองเท้า | 1,292,601.54 | Inventory asset — shoe materials |
| 1305 | เบ็ดเตล็ด | 212.00 | Inventory asset — sundries |
| 1306 | วัสดุสิ้นเปลือง | 18,034.50 | Inventory asset — consumables |

**Total inventory GL:** 2,268,125.31 — control target for stock valuation reconciliation.

---

## Mapping Candidate Rules

| Field | Rule |
|-------|------|
| `legacyAccountCode` | As-is from TB |
| `legacyAccountName` | Thai name from TB |
| `accountType` | ASSET / LIABILITY / EQUITY / (P&L excluded) |
| `proposedTargetCode` | TBD at M2 — candidate preserves legacy code |
| `includeInOpening` | true for BS; false for closed P&L lines |
| `confidence` | HIGH for TB-sourced accounts |

Full mapping: `data/migration/asas/m1/asas_coa_mapping_candidate.csv`

---

## ASAD Comparison

| Aspect | ASAD | ASAS |
|--------|------|------|
| CoA template | 197 accounts | 197 accounts (same structure) |
| TB scale | 8.3M | 40.6M |
| Inventory GL | 2,007,766.55 | 2,268,125.31 |
| Related party | ASAS listed as customer | 4151 เจ้าหนี้บริษัทที่เกี่ยวข้อง 1,207,708.75 |

CoA codes are **parallel**, not shared — each entity maintains its own ledger.
