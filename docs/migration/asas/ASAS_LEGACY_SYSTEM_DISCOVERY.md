# Legacy System Discovery — ASAS (Phase M0)

**Project:** asa-con-v0  
**Inspection date:** 2026-06-11  
**Legacy folder:** `O:/asa-con/account/asas/`  
**Migration target:** Closing **31/12/2025** → Opening **01/01/2026**  
**Scope:** Read-only discovery. No database writes, schema changes, imports, journals, or stock documents.

**Related prior work:** [ASAD LEGACY_SYSTEM_DISCOVERY.md](../LEGACY_SYSTEM_DISCOVERY.md)

---

## 1. Legacy System Overview

### Folder summary

| Metric | Value |
|--------|-------|
| Files scanned (root) | **22** |
| Legacy ERP (inferred) | Same Thai accounting package family as ASAD |
| Company | **บริษัท อาสา เซอร์วิส (ประเทศไทย) จำกัด** |
| Relationship to ASAD | **Separate legal entity** — related party (ASAD Customer Detail lists ASAS as customer #3) |

### Root workbooks

| File | Type | Size | Sheets | Purpose (inferred) | Likely module | Category |
|------|------|------|--------|-------------------|---------------|----------|
| `FinReport-202512.xls` | .xls | 518 KB | 6 | Year-end TB, BS, P&L, equity | Finance | **REPORT DATA** |
| `ASAS_Inventory202512.xls` | .xls | 3.6 MB | 25 | Inventory month-end + master | Inventory | **MASTER DATA** |
| `DataPostManual. - ปี68.xls` | .xls | 6.9 MB | 2 | Full GL transaction dump | Finance | **TRANSACTION DATA** |
| `GJ-202512-No.1/2/3.xls` | .xls | 972 / 390 / 145 KB | 1 each | General journal Dec 2025 | Finance | **TRANSACTION DATA** |
| `BCJ-202512.xls` / `BSJ-202512.xls` | .xls | 440 / 323 KB | 2 each | Bank journals + reconciliation | Finance | **TRANSACTION DATA** |
| `Sales00–30-2512.xlsx` (11 files) | .xlsx | 395 KB – 31 MB | 8 each | Per-shop POS/sales Dec 2512 | Sales/POS | **TRANSACTION DATA** |
| `Sales Tax2512.xlsx` | .xlsx | 2.2 MB | 12 | VAT sales schedule Dec 2512 | Tax | **REPORT DATA** |
| `Purchase Tax2512.xlsx` | .xlsx | 38 KB | 2 | VAT purchase schedule Dec 2512 | Tax | **REPORT DATA** |
| `ASAS-Asset202512.xlsx` | .xlsx | 188 KB | 2 | Fixed asset register | Finance | **REPORT DATA** |
| `ASASForm-Voucher(Payment).xlsx` | .xlsx | 12.4 MB | 78 | Payment voucher templates | Finance | **REFERENCE DATA** |
| `ASASForm-Voucher(Receipt).xls` | .xls | 2.4 MB | 37 | Receipt voucher templates | Finance | **REFERENCE DATA** |

Full file inventory: `data/migration/asas/discovery/asas_file_inventory.csv`

---

## 2. FinReport-202512.xls

### Sheets

| Sheet | Purpose |
|-------|---------|
| Trial Balance | GL accounts, debit/credit as of 31/12/2568 |
| Working Paper | TB ↔ P&L ↔ BS cross-check |
| Profit Loss | Income statement |
| Profit Loss Compare | Monthly/YTD comparison |
| Balance Sheet | Statement of financial position |
| งบการเปลี่ยนแปลงส่วน | Statement of changes in equity |

### Key figures (31/12/2025)

| Metric | Value (THB) |
|--------|-------------|
| Chart of accounts | **197** accounts (**92** non-zero) |
| Trial Balance (balanced) | **40,640,308.66** |
| Net profit 2025 | **23,494.96** |
| Retained earnings `301` (before close) | **1,956,275.55** |
| Retained earnings `301` (after P&L close) | **1,979,770.51** |
| Total assets (BS) | **6,929,390.20** |
| Total equity (BS) | **4,179,770.51** |

### Inventory GL (13xx)

| GL code | Name | Debit (THB) |
|---------|------|-------------|
| 1302 | ลูกกุญแจ | 957,277.27 |
| 1303 | วัสดุรองเท้า | 1,292,601.54 |
| 1305 | เบ็ดเตล็ด | 212.00 |
| 1306 | วัสดุสิ้นเปลือง | 18,034.50 |
| **Total** | | **2,268,125.31** |

---

## 3. ASAS_Inventory202512.xls

### Key sheets

| Sheet | Purpose | Notes |
|-------|---------|-------|
| Data In | Purchase/receipt transactions | Dec 2568 movement |
| Data Out | Issue/transfer to shops | e.g. shop 1 = Central Chidlom |
| Data Inventory | Adjustment lines | |
| Product Detail / Product Group | SKU master | Product codes align with ASAD naming |
| Shop Detail | Branch master | **27** active shops (not 184 — padding rows) |
| Customer / Supplier / Employee Detail | Masters | |
| Begining / Received / Ending | Dec 2568 stock report | **Ending** = closing qty source |
| Cost (ด.11) / Cost (ด.12) | Cost movement reports | Cost12 has unit costs (1,711 rows) |
| SetPrice | Cost + sell price history | **No match** on Ending qty lines |
| Usages Total | Usage summary | |

### Ending sheet (Dec 2568 closing)

| Metric | Value |
|--------|-------|
| Product codes in Ending | 32 (incl. 2 subtotal rows) |
| Lines with **qty > 0** | **30** |
| Total quantity | **11,138** units |
| SetPrice valuation on ending | **0** lines valued |
| Subtotal rows detected | `1302` ยอดรวมลูกกุญแจ, `1303` ยอดรวมวัสดุรองเท้า |

---

## 4. Source-of-Truth Matrix

| Domain | Primary source | Secondary / validation | Confidence |
|--------|----------------|------------------------|------------|
| Chart of Accounts | FinReport TB | DataPostManual | HIGH |
| Trial Balance | FinReport TB | Working Paper | HIGH |
| Balance Sheet | FinReport BS | Working Paper | HIGH |
| P&L | FinReport P&L | P&L Compare | HIGH |
| Journal Ledger | DataPostManual `Data` (~58K lines) | GJ-202512 No.1–3 | HIGH |
| Products | Inventory `Product Group` / `Product Detail` | Sales Product Detail sheets | HIGH |
| Inventory quantity | Inventory `Ending` | Begining/Received | HIGH |
| Inventory value | FinReport TB 13xx | Cost (ด.12) — not yet bridged to Ending | MEDIUM |
| Shops / branches | Inventory `Shop Detail` | Sales per-shop files | HIGH |
| Customers | Inventory `Customer Detail` | TB AR controls | MEDIUM |
| Suppliers | Inventory `Supplier Detail` | TB AP controls | MEDIUM |
| AR | TB `1101` etc. | No dedicated aging export | MEDIUM |
| AP | TB `4101`, `4151` | No dedicated aging export | MEDIUM |
| Tax (Dec 2025) | Sales/Purchase Tax2512 | TB VAT accounts | HIGH |

Details: `data/migration/asas/discovery/asas_finance_sources.csv`, `asas_inventory_sources.csv`

---

## 5. Cross-Company Observations (vs ASAD)

| Question | Finding |
|----------|---------|
| Same company? | **No** — ASAD = อาสา ดิสทริบิวชั่น; ASAS = อาสา เซอร์วิส |
| Mixed inventory pool? | **No** — separate GL books (ASAD 2.01M vs ASAS 2.27M) |
| Shared product codes? | **Yes** — 28 product codes with qty in both; quantities differ |
| ASAS fills ASAD valuation gap? | **No** — ASAS stock candidate value = 0 (no SetPrice); separate pools |

---

## 6. Discovery Outputs

| Output | Path |
|--------|------|
| File inventory | `data/migration/asas/discovery/asas_file_inventory.csv` |
| Finance sources | `data/migration/asas/discovery/asas_finance_sources.csv` |
| Inventory sources | `data/migration/asas/discovery/asas_inventory_sources.csv` |
| Migration matrix | `data/migration/asas/discovery/asas_migration_matrix.csv` |

---

## 7. Gaps and Missing Data

| Gap | Impact | Suggested next file |
|-----|--------|---------------------|
| No unit cost on Ending rows | Stock value candidate = 0 | Parse Cost (ด.12) closing unit costs; or Detail Inventory valuation sheet if exists |
| No AR/AP aging exports | Subledger import not ready | Customer/supplier statement or aging report |
| 11 of 27 shops have Sales files | POS history partial | Remaining shop Sales##-2512 files if they exist |
| Voucher forms only | Not transactional | Ignore for migration |

---

## 8. Inspection Method

Same as ASAD M0:

1. Enumerate folder files with size, extension, sheet names.
2. Classify each file: MASTER / TRANSACTION / REPORT / REFERENCE.
3. Parse FinReport TB for CoA, P&L close, inventory GL.
4. Parse Inventory Ending for closing quantities; flag subtotal rows.
5. Record confidence per source; no DB writes.

Script: `scripts/migration/build-asas-and-combined-package.ts`
