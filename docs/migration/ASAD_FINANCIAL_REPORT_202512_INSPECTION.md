# ASAD Financial Report 202512 — Migration Inspection

**Inspection date:** 2026-06-11  
**Purpose:** Assess usability of legacy closing data for **asa-con-v0** go-live on **01/01/2026** (opening balance from **31/12/2025** closing).  
**Scope:** Read-only analysis. No database writes, schema changes, posting logic changes, or journal creation.

---

## 1. Workbook overview

| Field | Value |
|-------|-------|
| **Referenced name** | `ASAD Financial Report-202512.xls` |
| **Actual file path** | `O:/asa-con/account/asad/FinReport-202512.xls` |
| **File size** | 539,136 bytes |
| **Last modified** | 2026-06-06 |
| **Report period** | 31 December **2568** (Buddhist era) = **31/12/2025** |
| **Company** | บริษัท อาสา ดิสทริบิวชั่น (ประเทศไทย) จำกัด |

### Sheets

| Sheet | Rows | Cols | Visibility | Detected sections |
|-------|------|------|------------|-------------------|
| Trial Balance | 1,424 | 31 | visible | GL trial balance — account name, code, debit, credit |
| Working Paper | 1,484 | 35 | visible | Cross-check: TB + P&L + BS columns side-by-side |
| Profit Loss | 1,265 | 38 | visible | Income statement (summary lines, 2568 vs 2567) |
| Profit Loss Compare | 1,298 | 27 | visible | P&L monthly / YTD comparison with % of sales |
| Balance Sheet | 1,259 | 38 | visible | Statement of financial position (summary, note refs) |
| งบแสดงการเปลี่ยนแปลงส่วน | 1,283 | 37 | visible | Statement of changes in equity |

All six sheets are **visible** (none hidden). Row counts include large trailing blank regions (~1,200+ padding rows per sheet).

### Structural notes

- **Formatted Thai financial statements**, not flat relational tables.
- Header blocks span rows 1–7 (company address, tax ID, report title, unit: baht).
- **Trial Balance** data starts at row 8 (header row 7): `ชื่อบัญชี | เลขที่บัญชี | เดบิต | เครดิต`.
- **Balance Sheet / P&L** use merged layout: labels in columns 0–3, amounts in columns 8 (2568) and 10 (2567).
- **Working Paper** duplicates TB balances and maps them into P&L and BS column groups for audit cross-check.
- Balance Sheet sheet continues with **note/disclosure detail** below the main statement (cash, AR breakdown, fixed-asset schedules).

---

## 2. Usable data classification

### A. Chart of Accounts candidate — **HIGH**

**Source:** `Trial Balance` sheet (rows 8+, column B = account code).

| Attribute | Finding |
|-----------|---------|
| Account code | Present — numeric codes (e.g. `1021`, `1121`, `301`, `5001`) |
| Account name | Present — Thai GL names |
| Account type | Inferable from code ranges (see below) |
| Parent / group | Partial — implicit from row order and section subtotal rows; **no parent account ID column** |

**Counts:** 197 account rows; 154 zero-balance; **43 with non-zero closing balance**.

**Inferred code → type mapping (Thai chart convention in this file):**

| Code range | Inferred type | Examples |
|------------|---------------|----------|
| 1–999 | EQUITY | `1` ทุนหุ้นสามัญ, `101` สำรองตามกฎหมาย, `301` กำไรสะสม |
| 1xxx | ASSET (current) | `1021` bank, `1121` AR, `1302` inventory sub-account |
| 2xxx | ASSET (fixed / contra) | `2211` PPE, `2261` accumulated depreciation (credit balance) |
| 3xxx | ASSET (other) | `3001` deposits |
| 4xxx | LIABILITY | `4101` AP, `4613` corporate tax payable |
| 5xxx | REVENUE | `5001` sales revenue |
| 6xxx–8xxx | EXPENSE | COGS, selling, admin |
| 9xxx | EXPENSE (tax / special) | `9001` corporate income tax |

**Extract:** `data/migration/inspection/asad_202512_coa_candidate.csv`

---

### B. Trial Balance / Closing Balance candidate — **HIGH**

**Source:** `Trial Balance` sheet.

| Attribute | Finding |
|-----------|---------|
| As-of date | 31/12/2025 (explicit in report title) |
| Debit / credit columns | Yes — cols C/D (เดบิต / เครดิต) |
| Opening balance for 01/01/2026 | **Yes, after year-end close adjustment** (see §6) |
| Balance check | Total debit = total credit = **8,295,763.67** |

**Grand total row:** row 207 — `ยอดรวม` 8,295,763.67 / 8,295,763.67.

**Non-zero accounts (43):** includes bank, AR, inventory GL lines, fixed assets, AP, tax payables, equity, revenue, and expense YTD balances.

**Extract:** `data/migration/inspection/asad_202512_trial_balance_candidate.csv`

---

### C. Balance Sheet candidate — **MEDIUM** (validation / reconciliation)

**Source:** `Balance Sheet` sheet.

| Line (2568) | Amount (THB) |
|-------------|--------------|
| Cash & equivalents | 908,539.12 |
| Trade & other receivables | 1,529,072.75 |
| Inventory | 2,007,766.55 |
| Total current assets | 4,445,378.42 |
| Non-current assets (net) | 12,036.00 |
| **Total assets** | **4,457,414.42** |
| Total liabilities | 320,645.35 |
| **Total equity** | **4,136,769.07** |
| Liabilities + equity | 4,457,414.42 |

**Usable for:** cross-check against TB-derived balances and future Balance Sheet report (16F).  
**Not usable for:** account-level BS import (summary lines only, note references not GL codes).

**Extract:** `data/migration/inspection/asad_202512_balance_sheet_candidate.csv`

---

### D. Profit & Loss candidate — **MEDIUM** (validation)

**Source:** `Profit Loss` sheet (+ `Profit Loss Compare` for prior-year / monthly context).

| Line (year ended 31/12/2025) | Amount (THB) |
|------------------------------|--------------|
| Total revenue | 4,044,317.23 |
| Total expenses | 3,203,766.54 |
| Profit before tax | 840,550.69 |
| Income tax | 81,082.60 |
| **Net profit** | **759,468.09** |

**Usable for:** P&L report validation (16E) against TB P&L account roll-up.  
**Not usable for:** expense account mapping without TB (summary captions ≠ GL detail).

**Extract:** `data/migration/inspection/asad_202512_pl_candidate.csv`

---

### E. Cash / Bank candidate — **MEDIUM**

| Source | Account / line | Balance (THB) |
|--------|----------------|---------------|
| TB | `1021` เงินฝากธนาคาร | 908,539.12 debit |
| BS | เงินสดและรายการเทียบเท่าเงินสด | 908,539.12 |

**Notes:** No bank account sub-ledger (single consolidated GL). `1001` / `1011` / `1031` are zero. No transaction-level bank statement in this file.

---

### F. AR / AP candidate — **LOW–MEDIUM**

**AR (TB, debit balances):**

| Code | Name | Balance (THB) |
|------|------|---------------|
| 1121 | ลูกหนี้การค้า - อื่น | 321,364.00 |
| 1131 | ลูกหนี้การค้า - บริษัทที่เกี่ยวข้องกัน | 1,207,708.75 |

**AP (TB, credit balances):**

| Code | Name | Balance (THB) |
|------|------|---------------|
| 4101 | เจ้าหนี้การค้า | 27,948.94 |
| 4501 | เงินเดือนค้างจ่าย | 130,000.00 |
| 4551–4613 | Accruals / tax payables | various |

**Missing:** Customer/supplier subledger, invoice-level open items, aging. BS note section shows AR detail by category but not by debtor.

---

### G. Stock / Inventory candidate — **MEDIUM** (value only)

**Inventory value from TB (13xx accounts):**

| Code | Name | Debit (THB) |
|------|------|-------------|
| 1301 | เครื่องจักรและอุปกรณ์ | 324,252.50 |
| 1302 | ลูกกุญแจ | 269,409.19 |
| 1303 | วัสดุรองเท้า | 921,940.13 |
| 1304 | แม่กุญแจ | 68,572.74 |
| 1311 | สินค้าระหว่างทาง | 423,591.99 |
| **Sum** | | **2,007,766.55** |

Matches BS line **สินค้าคงเหลือ** 2,007,766.55.

**Missing in this file:** Product-level quantities, SKU mapping, warehouse detail. Use **`ASAD_Inventory202512.xls`** (same folder) for stock migration.

---

### H. Equity / retained earnings — **MEDIUM** (supplementary)

**Source:** `งบแสดงการเปลี่ยนแปลงส่วน` sheet.

| Item (2568 closing) | Amount (THB) |
|---------------------|--------------|
| Share capital | 2,000,000.00 |
| Legal reserve | 200,000.00 |
| Unappropriated retained earnings | 1,936,769.07 |
| **Total equity** | **4,136,769.07** |
| Net profit for 2568 | 759,468.09 |
| Dividends paid | (1,000,000.00) |

Reconciles: TB `301` opening RE 1,177,300.98 + net profit 759,468.09 − dividends (per equity stmt) → unappropriated RE 1,936,769.07.

---

## 3. Unusable or risky data

| Section | Risk | Reason |
|---------|------|--------|
| Balance Sheet (main statement) | Summary only | No GL account codes; note numbers (หมายเหตุ 1–7) are not import keys |
| Profit Loss (main statement) | Summary only | Caption lines without account codes; cannot map 1:1 to CoA without TB |
| Profit Loss Compare | Layout risk | Amounts in left columns, labels in centre — easy to mis-parse; use for human validation only |
| Working Paper | Redundant | Same TB data rearranged; extra P&L/BS columns mostly blank for expense lines |
| TB rows without code | Group headers | Subtotal rows (e.g. `เงินสดและเงินฝากธนาคาร`) have no account code |
| TB row 107 | Misleading total | `รายได้รวมภาษีมูลค่าเพิ่ม` with code `5000` — section marker, zero balance |
| Equity codes 1–401 | Ambiguous width | Codes &lt; 1000 are equity but collide visually with 1xxx assets if zero-padded incorrectly |
| Accumulated depreciation (226x/227x) | Sign convention | Credit balances in TB; must map to `LIABILITY` or contra-asset with correct normal balance in v0 |
| Open P&L in TB | **Critical for opening** | Revenue/expense YTD balances are non-zero — must **not** carry forward to 01/01/2026 opening as-is |
| AR/AP | No subledger | Control account totals only |
| Inventory | No quantity | Value by GL sub-class only |
| Trailing blank rows | Noise | ~1,200 empty rows per sheet |
| Multi-page headers | Parse risk | Company block repeated mid-sheet (page breaks) |

**No duplicate account codes** detected in Trial Balance.

---

## 4. Migration recommendation

| Question | Answer | Confidence |
|----------|--------|------------|
| Can this file be used for **CoA import**? | **Yes** — 197 accounts with code + name from TB; types must be inferred/mapped to `GlAccountType` | High |
| Can this file be used for **31/12/2025 Trial Balance**? | **Yes** — balanced GL-level debit/credit per account | High |
| Can this file be used to create **Opening Journal on 01/01/2026**? | **Yes, with year-end close step** — roll P&L into retained earnings (`301`), zero P&L accounts; see §6 | Medium–High |
| Can this file support **Balance Sheet 16F** tests? | **Partial** — summary totals for reconciliation; not account-level BS report | Medium |
| Can this file support **P&L 16E** validation? | **Yes** — net profit 759,468.09 matches TB P&L roll-up and equity statement | High |
| What additional files are needed? | See below | — |

### Additional files recommended

| File (same folder) | Purpose |
|--------------------|---------|
| `ASAD_Inventory202512.xls` | Product-level stock qty/value for inventory migration |
| `GJ-202512-no.1.xls`, `GJ-202512_No.2.xls` | General journal detail (audit trail, optional) |
| `SJ000-202512.xls`, `SJ001-202512.xls` | Sales journals — AR/revenue detail |
| `AsadData68.xls` | Possible master / transaction export (not inspected here) |
| Bank statements / AR aging | Subledger opening balances (not in FinReport) |

---

## 5. Proposed asa-con-v0 mapping

| Source Sheet | Source Columns | Target Concept | Target Module | Confidence |
|--------------|----------------|----------------|---------------|------------|
| Trial Balance | `เลขที่บัญชี`, `ชื่อบัญชี` | Chart of Accounts import | Finance — GL account CSV import | **High** |
| Trial Balance | `เดบิต`, `เครดิต` (non-zero rows) | Trial Balance as of 2025-12-31 | Finance Core 16C | **High** |
| Trial Balance | BS + equity rows only, adjusted RE | Opening Journal (01/01/2026) | Finance Core 16B | **Medium–High** |
| Trial Balance | `1021` | Cash/bank opening balance | Finance + reconciliation | **High** |
| Trial Balance | `1121`, `1131`, `4101` | AR/AP control accounts | Finance (no subledger) | **Medium** |
| Trial Balance | `1301`–`1311` | Inventory GL value | Finance + stock migration | **Medium** |
| Balance Sheet | Summary lines, col 2568 | BS total validation | Finance 16F (planned) | **Medium** |
| Profit Loss | Net profit line | P&L validation | Finance 16E | **High** |
| งบแสดงการเปลี่ยนแปลงส่วน | Equity movements | Retained earnings / dividend check | Finance Core 16B | **Medium** |
| Working Paper | TB cols C–D | Cross-check only | Inspection | **Low** (redundant) |
| Profit Loss Compare | YTD columns | Prior-year variance check | Inspection | **Low** |

**asa-con-v0 CoA CSV required headers** (from `gl-account-csv-parser.ts`): `code`, `name`, `accountType`, `normalBalance`, `isActive` — types must be mapped from inferred ranges above.

---

## 6. Opening journal feasibility

### A. Full trial balance (as exported — includes open P&L)

| Metric | Value (THB) |
|--------|-------------|
| Total debit | 8,295,763.67 |
| Total credit | 8,295,763.67 |
| Difference | 0.00 |
| **Balanced** | **Yes** |

**Verdict:** Mathematically balanced, but **not appropriate** as 01/01/2026 opening without closing P&L accounts (revenue/expense YTD would incorrectly carry forward).

### B. Balance sheet accounts only (non-zero, codes 1–4xxx + equity 1–999)

| Metric | Value (THB) |
|--------|-------------|
| Total debit | 5,010,280.88 |
| Total credit | 4,250,812.79 |
| Difference | 759,468.09 |
| **Balanced** | **No** |

Difference equals **net profit after tax** still residing in P&L accounts.

### C. Recommended opening journal (P&L closed to equity)

**Adjustment:** Roll all P&L (5xxx–9xxx) net into `301` กำไร (ขาดทุน) สะสม; set P&L lines to zero.

| Metric | Value (THB) |
|--------|-------------|
| Net profit (P&L credits − debits, incl. tax) | 759,468.09 |
| RE `301` before close | 1,177,300.98 |
| RE `301` after close | 1,936,769.07 |
| Adjusted total debit | 5,010,280.88 |
| Adjusted total credit | 5,010,280.88 |
| Difference | 0.00 |
| **Balanced** | **Yes** |

**Verdict:** Opening journal is **feasible** after explicit year-end close transformation. TB provides all amounts; transformation is a **migration script step**, not raw import.

---

## 7. Output artifacts

### Script

```
scripts/migration/inspect-asad-financial-report-202512.ts
```

Run:

```bash
npx tsx scripts/migration/inspect-asad-financial-report-202512.ts
# optional: --file="O:/asa-con/account/asad/FinReport-202512.xls"
```

**xlsx dependency:** Resolved from sibling `../asa-con/node_modules/xlsx` (v0.18.5). Not installed in asa-con-v0. To add locally: `npm install -D xlsx`.

### CSV extracts (inspection only — not import-ready)

| File | Description |
|------|-------------|
| `data/migration/inspection/asad_202512_sheets_inventory.csv` | Sheet names, dimensions, visibility |
| `data/migration/inspection/asad_202512_coa_candidate.csv` | 197 accounts, inferred type/group |
| `data/migration/inspection/asad_202512_trial_balance_candidate.csv` | Full TB with debit/credit |
| `data/migration/inspection/asad_202512_pl_candidate.csv` | P&L lines with amounts |
| `data/migration/inspection/asad_202512_balance_sheet_candidate.csv` | BS summary lines |

CoA CSV lacks `accountType` / `normalBalance` enums required by v0 import — intentional; mapping is a separate migration step.

---

## Executive summary

### Usable data

- **Trial Balance** is the primary migration source: **197 GL accounts**, **43 with balances**, **balanced at 8.3M THB**, dated **31/12/2025**.
- **CoA import** and **TB validation (16C)** are well supported.
- **Opening journal (16B)** is feasible after closing P&L to retained earnings (`301` → 1,936,769.07).
- **P&L validation (16E):** net profit **759,468.09** consistent across P&L sheet, TB, and equity statement.
- **Inventory value** **2,007,766.55** available at GL sub-account level; quantities need `ASAD_Inventory202512.xls`.
- **Bank** single account **908,539.12**; **AR** **1,529,072.75** at control level.

### Unusable / risky data

- BS and P&L **statement sheets** are presentation summaries — not machine-ready for account-level import.
- **No AR/AP/inventory subledgers** in this file.
- **Open P&L in raw TB** must not be posted as opening balances without close adjustment.
- **Equity codes** (1, 101, 301) need careful handling vs 1xxx asset codes.

### Opening balance readiness

| Stage | Status |
|-------|--------|
| Raw TB balanced | ✅ Ready |
| BS-only opening without close | ❌ Not balanced |
| Adjusted opening (P&L → RE) | ✅ Ready (script-verified) |

### Recommended next step

1. Build **CoA mapping table** (197 rows): Thai code → `GlAccountType` + `normalBalance` + optional parent.
2. Build **opening journal transform**: TB → filter non-zero BS/equity + computed RE → 16B manual journal draft (dry-run).
3. Inspect **`ASAD_Inventory202512.xls`** for product/qty migration.
4. Cross-validate transformed opening against BS totals (assets 4,457,414.42 = liabilities 320,645.35 + equity 4,136,769.07).
5. Do **not** import CSV extracts directly — produce import-ready files only after mapping review.

---

*Generated by inspection script. Re-run after source file updates.*
