# ASAS M1 — Opening Journal Specification

**Company:** บริษัท อาสา เซอร์วิส (ประเทศไทย) จำกัด  
**Effective date:** 01/01/2026  
**Source:** `FinReport-202512.xls` → Trial Balance (31/12/2025)  
**Output:** `data/migration/asas/m1/asas_opening_journal_candidate.csv`

---

## Objective

Produce a **balanced opening journal candidate** containing only balance sheet accounts after closing P&L into retained earnings (`301`). No import performed in M1.

---

## Transformation Rules

1. Read Trial Balance as of 31/12/2025.
2. Exclude all revenue and expense accounts from opening lines.
3. Compute net profit from P&L accounts: **23,494.96 THB**.
4. Adjust `301` กำไร (ขาดทุน) สะสม by net profit.
5. Emit one line per non-zero balance sheet account.
6. Verify debit total = credit total exactly.

---

## Opening Journal Statistics

| Metric | Value (THB) |
|--------|-------------|
| Lines | **41** |
| Total debits | **22,281,061.82** |
| Total credits | **22,281,061.82** |
| Balanced | **Yes** ✅ |
| Net profit closed to `301` | **23,494.96** |
| `301` opening balance | **1,979,770.51** (credit) |

---

## Key Balance Sheet Lines

| Account | Name | Debit | Credit |
|---------|------|-------|--------|
| 1 | ทุนหุ้นสามัญ | — | 2,000,000.00 |
| 301 | กำไร (ขาดทุน) สะสม | — | 1,979,770.51 |
| 1021 | เงินฝากธนาคาร | 1,708,002.29 | — |
| 1101 | ลูกหนี้การค้า | 227,464.10 | — |
| 1302 | ลูกกุญแจ | 957,277.27 | — |
| 1303 | วัสดุรองเท้า | 1,292,601.54 | — |
| 2211 | เครื่องจักรและอุปกรณ์ | 12,505,553.43 | — |
| 4151 | เจ้าหนี้บริษัทที่เกี่ยวข้อง | — | 1,207,708.75 |
| 4901 | ภาระผูกพันผลประโยชน์พนักงาน | — | 866,314.00 |

Full list: `asas_opening_journal_candidate.csv`

---

## Reconciliation Checks

| Check | Legacy | Transformed | Status |
|-------|--------|-------------|--------|
| Trial Balance balanced | 40,640,308.66 | 40,640,308.66 | PASS |
| Opening journal balanced | 22,281,061.82 | 22,281,061.82 | PASS |
| Net profit | 23,494.96 | 23,494.96 | PASS |
| Inventory GL vs stock candidate | 2,268,125.31 | 0.00 | **WARNING** |

Source: `data/migration/asas/m1/asas_reconciliation_summary.csv`

---

## Import Safety Rules

| Rule | Status |
|------|--------|
| No open revenue/expense in opening | ✅ Enforced |
| Debit = credit | ✅ 22,281,061.82 |
| P&L closed to `301` | ✅ |
| Inventory control balance | ⚠️ Stock candidate does not explain 13xx — use GL control only |

---

## What Must Remain Manual

- **Inventory GL (2,268,125.31)** until stock valuation candidate is built from Cost (ด.12) or accountant-provided costs.
- **Fixed asset net book values** — verify against ASAS-Asset202512 before subledger import.
- **Related party AP (4151)** — confirm counterparty mapping to ASAD entity.

---

## Candidate CSV Schema

| Column | Description |
|--------|-------------|
| accountCode | Legacy GL code |
| accountName | Thai account name |
| debit | Opening debit |
| credit | Opening credit |
| effectiveDate | 2026-01-01 |
| source | ASAS FinReport TB |
