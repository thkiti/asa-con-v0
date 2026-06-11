# ASAS Migration Readiness Matrix

**Project:** asa-con-v0  
**Company:** บริษัท อาสา เซอร์วิส (ประเทศไทย) จำกัด  
**Inspection date:** 2026-06-11  
**Target:** 01/01/2026 opening  
**Data:** `data/migration/asas/discovery/asas_migration_matrix.csv`

---

## Summary Verdict

| Area | Verdict | Score (est.) |
|------|---------|--------------|
| Finance opening journal | **GO WITH CONDITIONS** | 96% |
| Inventory quantity | **GO WITH CONDITIONS** | 85% |
| Inventory valuation | **NOT READY** | 25% |
| Products | **GO WITH CONDITIONS** | 88% |
| Branches | **GO** | 90% |
| AR | **GO WITH CONDITIONS** | 65% |
| AP | **GO WITH CONDITIONS** | 72% |
| Tax (Dec 2025) | **GO WITH CONDITIONS** | 75% |
| **Overall** | **GO WITH CONDITIONS** | 82% |

Combined ASAD+ASAS score: see `data/migration/combined/asad_asas_readiness_score.csv` — **NOT READY** for merged migration.

---

## Domain Readiness

### Finance

| Item | Status | Source | Notes |
|------|--------|--------|-------|
| Chart of Accounts | ✅ Available | FinReport TB | 197 accounts |
| Trial Balance 31/12/2025 | ✅ Balanced | FinReport TB | 40,640,308.66 |
| P&L close to RE | ✅ Computed | Script | Net profit 23,494.96 → `301` |
| Opening journal candidate | ✅ Balanced | M1 CSV | 41 lines, 22,281,061.82 D/C |
| GL transaction history | ✅ Available | DataPostManual | ~58K lines |
| Fixed assets | ⚠️ Partial | ASAS-Asset202512 | Register only; no auto-depreciation import |

**Condition:** Import opening journal only after P&L closed into `301`; exclude revenue/expense accounts.

### Inventory

| Item | Status | Source | Notes |
|------|--------|--------|-------|
| Closing quantity | ✅ Available | Ending sheet | 30 lines, 11,138 units |
| Product master | ✅ Available | Product Group/Detail | Codes overlap ASAD |
| Shop master | ✅ Available | Shop Detail | 27 shops |
| Unit cost / valuation | ❌ Missing on Ending | SetPrice empty | GL inventory 2,268,125.31 unmatched |
| Subtotal row detection | ✅ Flagged | 1302, 1303 | `excludeFromImport = true` |
| Cost movement data | ⚠️ Partial | Cost (ด.12) | 1,711 rows — needs transform bridge |

**Condition:** Do not import stock value until cost source identified; qty-only import possible with manual cost allocation marked explicitly.

### AR / AP

| Item | Status | Notes |
|------|--------|-------|
| AR control (TB) | ✅ | 1101 ลูกหนี้การค้า 227,464.10 |
| AP control (TB) | ✅ | 4101 + 4151 (related party 1,207,708.75) |
| Customer master | ⚠️ | In inventory export; limited rows |
| Supplier master | ⚠️ | In inventory export |
| Aging / open invoices | ❌ | Not in folder |

### Tax

| Item | Status | Source |
|------|--------|--------|
| VAT sales Dec 2025 | ✅ | Sales Tax2512.xlsx |
| VAT purchase Dec 2025 | ✅ | Purchase Tax2512.xlsx |
| VAT control accounts | ✅ | TB 1452, 4602 |

### Sales / POS (non-opening)

| Item | Status | Notes |
|------|--------|-------|
| Per-shop sales Dec 2512 | ⚠️ Partial | 11 shop files (00, 01, 06, 10, 12, 24–26, 28, 30) |
| Historical POS import | Not in scope | Discovery only |

---

## File-Level Readiness

| File | Module | Migration use | Confidence |
|------|--------|---------------|------------|
| FinReport-202512.xls | Finance | **Primary** — opening TB/BS/P&L | HIGH |
| ASAS_Inventory202512.xls | Inventory | **Primary** — qty + masters | HIGH |
| DataPostManual. - ปี68.xls | Finance | Secondary — audit trail | HIGH |
| GJ/BCJ/BSJ-202512 | Finance | Validation | MEDIUM |
| Sales Tax2512 / Purchase Tax2512 | Tax | Validation | HIGH |
| Sales##-2512.xlsx | Sales | Historical only | MEDIUM |
| ASAS-Asset202512.xlsx | Finance | Manual asset review | MEDIUM |
| Voucher forms | — | **Exclude** | HIGH |

---

## Blockers vs Conditions

### Blockers (must resolve before value import)

1. **Inventory valuation** — 0% of GL covered by SetPrice on Ending; 2.27M gap.
2. **No combined entity model** — ASAS must not be merged with ASAD inventory or GL.

### Conditions (can proceed with controls)

1. Finance opening journal — balanced after P&L close; control-balance only for unmatched stock.
2. Inventory qty import — 30 lines ready with `NEEDS_COST` flag.
3. Branch mapping — 27 shops mapped in candidate CSV.
4. Tax — Dec 2025 files present for reconciliation.

---

## Next Phase Recommendation

**M2 (per entity):** ASAS finance opening import candidate review → manual sign-off on inventory cost bridge from Cost (ด.12) → then qty+value stock candidate v2.

**Do not:** Merge ASAD+ASAS opening packages.
