# Migration Readiness Matrix — ASAD Legacy → asa-con-v0

**Inspection date:** 2026-06-11  
**Go-live target:** 01/01/2026 (opening from 31/12/2025 closing)  
**Legacy folder:** `O:/asa-con/account/asad/`  
**Companion doc:** [LEGACY_SYSTEM_DISCOVERY.md](./LEGACY_SYSTEM_DISCOVERY.md)

---

## Summary dashboard

| Area | Ready | Confidence | Blocker |
|------|-------|------------|---------|
| Finance / GL opening | Yes (with transform) | High | P&L must close to RE |
| Inventory opening | Yes (qty) | High | Value reconciliation to GL |
| Master products | Yes | High | Group/SKU mapping |
| Master branches | Yes | High | 183 shops → branches |
| AR / AP subledger | No | Low | No open-item files |
| Customer master | Partial | Low | Only 3 customers in export |
| Tax opening | No | Low | Tax files are Apr 2026 |
| Complete package | **Partial** | **Medium** | AR subledger + customer master |

**Verdict:** A **finance + inventory opening package** can be generated. A **complete subledger-accurate package** cannot without additional exports.

---

## Matrix by migration target

| Migration target | Available | Missing | Partial detail | Primary source | Validation source | Confidence |
|------------------|-----------|---------|----------------|----------------|-------------------|------------|
| **Chart of Accounts** | Yes | Parent hierarchy IDs | Type/normalBalance mapping | FinReport TB | AsadData68 account list | **High** |
| **Customers** | Partial | Trade customer list | Only 3 related-party rows | Inventory Customer Detail | SJ customer names | **Low** |
| **Suppliers** | Yes | — | No open balances | Inventory Supplier Detail | TB 4101 | **Medium** |
| **Products** | Yes | — | 3676 groups / 995 SKUs | Inventory Product Group + Detail | Stockcard filenames | **High** |
| **Product groups / pricing** | Yes | — | SetPrice has cost+sell | Inventory SetPrice | Price sheet | **High** |
| **Branches / shops** | Yes | — | 183 locations | Inventory Shop Detail | SJ branch code 0 | **High** |
| **Employees** | Yes | — | 30 staff names | Inventory Employee Detail | — | **Medium** |
| **Inventory (quantity)** | Yes | — | 188 groups with Dec qty | Inventory Ending | Stockcard2025 | **High** |
| **Inventory (value)** | Partial | SKU-level cost for all | GL uses 5 inventory accounts | FinReport TB 13xx | SetPrice cost columns | **Medium** |
| **Opening stock document** | Yes | SKU-level opening split | Group-level qty available | Inventory Ending | TB inventory value | **High** |
| **AR (control)** | Partial | Invoice-level | TB 1121+1131 = 1,529,072.75 | FinReport TB | BS receivables line | **Medium** |
| **AP (control)** | Partial | Bill-level | TB 4101+ accruals | FinReport TB | BS payables line | **Medium** |
| **Opening journal** | Yes | — | Requires P&L close step | FinReport TB | AsadData68 close entry | **High** |
| **Trial balance** | Yes | — | Balanced 8.3M | FinReport TB | Working Paper | **High** |
| **Balance sheet** | Yes | Account-level BS | Summary totals only | FinReport BS | TB-derived BS | **Medium** |
| **P&L (2025)** | Yes | GL expense detail in report | Summary + TB accounts | FinReport P&L | TB 5xxx–9xxx | **High** |
| **Retained earnings** | Yes | — | RE 301 + close 759,468.09 | FinReport + Equity stmt | AsadData68 close | **High** |
| **Cash / bank** | Yes | Bank sub-accounts | Single GL 1021 | FinReport TB | BS cash line | **High** |
| **Fixed assets** | Yes | Asset register detail | Net PPE 36 in BS | FinReport TB 22xx | BS note | **Medium** |
| **Tax (VAT)** | Partial | Dec 2025 VAT reports | Apr 2026 schedules only | Sales/Purchase Tax2604 | TB 4602/461x | **Low** |
| **Tax (corporate)** | Yes | — | 9001 + 4613 balances | FinReport TB | P&L tax line | **Medium** |
| **Sales transactions** | Partial | Full Dec sales detail | SJ has ~3 rows | SJ000/SJ001 | AsadData68 | **Low** |
| **Purchase transactions** | Partial | PJ export | Data In receipts only | Inventory Data In | GJ samples | **Medium** |
| **Vouchers (historical)** | Reference | — | Print templates only | ASADForm-Voucher* | — | **N/A** |

---

## Finance opening package checklist

| # | Requirement | Status | Source | Value / note |
|---|-------------|--------|--------|--------------|
| 1 | Closing TB dated 31/12/2025 | Done | FinReport TB | Balanced |
| 2 | CoA codes + names | Done | FinReport TB | 197 accounts |
| 3 | Non-zero balance lines | Done | FinReport TB | 43 lines |
| 4 | Revenue YTD identified | Done | TB `5001` | 4,044,317.23 Cr |
| 5 | Expense YTD identified | Done | TB `6xxx`–`9xxx` | Net → 759,468.09 |
| 6 | RE account identified | Done | TB `301` | 1,177,300.98 Cr pre-close |
| 7 | Year-end close rule | Documented | AsadData68 + analysis | Roll P&L → `301` |
| 8 | Adjusted opening balanced | Verified | Script | 5,010,280.88 Dr = Cr |
| 9 | BS totals reconcile | Verified | FinReport BS | 4,457,414.42 |
| 10 | Bank balance | Verified | TB `1021` | 908,539.12 |

---

## Inventory opening package checklist

| # | Requirement | Status | Source | Value / note |
|---|-------------|--------|--------|--------------|
| 1 | Product master | Done | Product Group + Detail | 3676 / 995 |
| 2 | Closing quantities | Done | Ending sheet | 188 groups |
| 3 | Units of measure | Done | Product Group col หน่วย | ดอก, คู่, etc. |
| 4 | Warehouse / branch | Done | Shop Detail | HO + 182 shops |
| 5 | GL inventory value target | Done | FinReport 13xx | 2,007,766.55 |
| 6 | Cost per group | Partial | SetPrice | Not all groups |
| 7 | SKU-level opening | Missing rule | — | Need group→SKU split |
| 8 | In-transit stock | Identified | TB `1311` | 423,591.99 |

---

## Source-of-truth precedence rules

When sources conflict, use this order:

| Domain | 1st (authoritative) | 2nd (corroborate) | Ignore |
|--------|---------------------|-------------------|--------|
| GL balances | FinReport TB | AsadData68 aggregated | Voucher templates |
| GL transactions | AsadData68 | GJ-202512 exports | — |
| Inventory qty | Inventory **Ending** | Stockcard2025 last balance | Detail Inventory (2551) |
| Inventory value | FinReport TB 13xx | SetPrice × qty | Detail Inventory |
| Products | Product Group + Detail | Stockcard filenames | — |
| Customers | **None complete** | SJ names | 3-row Customer Detail alone |
| Suppliers | Supplier Detail | Data In names | — |
| Tax | TB tax accounts | — | Tax2604 (wrong month) |

---

## Opening balance readiness

### Finance

```
Closing TB (31/12/2025)     ✅  Available — FinReport
Year-end close transform    ✅  Specified — P&L → RE 301
Opening journal balanced    ✅  Verified — 5,010,280.88
CoA import-ready            ⚠️  Needs mapping table
Subledger (AR/AP)           ❌  Not available
```

### Inventory

```
Product master              ✅  Available
Closing qty (group level)   ✅  Available — 188 rows
Opening stock document      ✅  Feasible at HO
GL value reconciliation     ⚠️  Medium — 5 GL accounts vs 188 groups
SKU-level opening           ⚠️  Needs business rules
```

### AR / AP

```
Control account balances    ✅  TB accounts
Customer master             ❌  Incomplete (3 rows)
Supplier master             ✅  27 rows
Open invoice/bill detail    ❌  Missing
```

---

## Validation report map (post-migration)

| asa-con-v0 module | Legacy validation source | Expected match |
|-------------------|-------------------------|----------------|
| 16C Trial Balance | FinReport TB (adjusted) | Account balances |
| 16E P&L | FinReport P&L | Net 759,468.09 |
| 16F Balance Sheet (planned) | FinReport BS | Totals |
| Stock on hand | Inventory Ending | Qty by group |
| Inventory GL | FinReport 13xx | Value 2,007,766.55 |
| Reconciliation dashboard | TB vs BS vs inventory | Variance thresholds |

---

## Risk-ranked gaps

| Priority | Gap | Impact | Mitigation |
|----------|-----|--------|------------|
| P1 | No AR open-item export | Cannot migrate invoice-level AR | Accept control balance; parallel run |
| P1 | Customer master (3 rows) | Cannot map debtors | Request franchise/customer export |
| P1 | P&L close not in FinReport TB | Wrong opening if imported raw | Mandatory transform script |
| P2 | Inventory value ≠ sum(qty×cost) | Stock GL mismatch | Map groups to 5 GL buckets |
| P2 | No Dec 2025 VAT reports | Tax validation incomplete | Export ภาษี ธ.ค. 2568 |
| P3 | SJ low row count | Limited sales audit | Use AsadData68 for sales lines |
| P3 | Voucher templates vs data | Confusion risk | Document as reference only |

---

## Recommended next phase: M1

| Step | Deliverable | Owner action |
|------|-------------|--------------|
| 1 | `coa_mapping_asad.csv` | Map 197 accounts to v0 types |
| 2 | `opening_journal_spec.md` | Close rules + line list |
| 3 | `product_group_mapping.csv` | Legacy group → v0 product |
| 4 | `shop_branch_mapping.csv` | 183 shops → v0 branches |
| 5 | `opening_stock_draft.csv` | From Ending sheet |
| 6 | Reconciliation workbook | TB ↔ BS ↔ inventory |
| 7 | Request AR aging export | Business / legacy admin |

**Do not import until M1 mappings are reviewed and signed off.**

---

## CSV exports

| File | Description |
|------|-------------|
| `data/migration/discovery/legacy_file_inventory.csv` | All 207 files with classification |
| `data/migration/discovery/legacy_finance_sources.csv` | Finance source-of-truth roles |
| `data/migration/discovery/legacy_inventory_sources.csv` | Inventory source-of-truth roles |
| `data/migration/discovery/legacy_migration_matrix.csv` | Target availability summary |

*Generated by `npx tsx scripts/migration/discover-legacy-asad-folder.ts`*
