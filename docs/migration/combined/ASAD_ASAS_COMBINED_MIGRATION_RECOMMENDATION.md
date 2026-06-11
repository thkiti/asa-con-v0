# ASAD + ASAS — Combined Migration Recommendation

**Project:** asa-con-v0  
**Date:** 2026-06-11  
**Phase:** M1 complete (discovery + transform candidates)  
**Constraint:** No DB import, no schema changes, no application code changes

---

## Answers to Key Questions

### 1. Does ASAS contain the missing ASAD inventory valuation detail?

**No.** ASAS has its own inventory GL of **2,268,125.31** and its own Ending quantities. ASAS SetPrice does not value Ending rows (candidate value = 0). The ASAD ~1.57M gap is an **ASAD-internal** problem, not recoverable from ASAS files.

### 2. Is ASAS stock combined with ASAD stock in any file?

**No.** Separate companies, separate `*_Inventory202512.xls` workbooks, separate FinReport TBs. Product codes overlap but quantities differ — **parallel catalogs**, not a merged pool.

### 3. Are ASAD and ASAS separate companies, branches, shops, or mixed pools?

**Separate legal entities** in the same corporate group:
- ASAD = distribution company (13 shops)
- ASAS = service company (27 shops)
- Related party: ASAD lists ASAS as customer; ASAS has AP 4151 to related companies (1.21M)

### 4. Can ASAD + ASAS combined inventory reconcile to GL inventory?

**Per entity:** GL reconciles to itself; stock candidates do not yet.
**Combined:** Summing stock candidates (438,605) does **not** reconcile to ASAD GL (2.01M) or group GL (4.28M). **Do not combine** inventory opening packages.

### 5. Source-of-truth for inventory quantity and value?

| Entity | Quantity | Value |
|--------|----------|-------|
| ASAD | `ASAD_Inventory202512.xls` / Ending | GL 13xx target; SetPrice partial candidate |
| ASAS | `ASAS_Inventory202512.xls` / Ending | GL 13xx target; Cost (ด.12) pending |

### 6. Import-ready opening packages — separate or combined?

**Separate.** Two companies → two opening journals, two stock packages, two branch maps.

---

## Final Recommendation Categories

| Domain | Verdict | Rationale |
|--------|---------|-----------|
| **Finance** | **GO WITH CONDITIONS** | Both entities have balanced TB + opening journal candidates after P&L close |
| **Inventory** | **NOT READY** | Both entities lack full stock-to-GL valuation bridge |
| **AR** | **GO WITH CONDITIONS** | TB controls present; no aging subledgers |
| **AP** | **GO WITH CONDITIONS** | TB controls present; related party needs mapping |
| **Tax** | **GO WITH CONDITIONS** (ASAS) / **NOT READY** (ASAD) | ASAS has Dec 2512 tax files; ASAD folder has Apr 2569 tax only |
| **Overall** | **GO WITH CONDITIONS** (per entity) / **NOT READY** (combined) | Migrate separately |

### Per-entity overall

| Entity | Overall |
|--------|---------|
| ASAD only | **GO WITH CONDITIONS** (78%) |
| ASAS only | **GO WITH CONDITIONS** (82%) |
| Combined | **NOT READY** — migrate separately |

Score table: `data/migration/combined/asad_asas_readiness_score.csv`

---

## What Is Still Missing

### ASAD

| Item | Priority |
|------|----------|
| Inventory valuation bridge (1.57M gap) | **High** |
| Dec 2025 VAT files (folder has Apr 2569) | Medium |
| AR/AP aging or open invoice listing | Medium |
| Confirm Detail Inventory / Cost12 for closing unit costs | High |

### ASAS

| Item | Priority |
|------|----------|
| Unit costs for 30 Ending lines (Cost ด.12 transform) | **High** |
| Remaining shop Sales files (16 of 27 shops missing Dec 2512) | Low (non-opening) |
| AR/AP subledger detail | Medium |
| Fixed asset NBV verification | Medium |

### Combined

| Item | Priority |
|------|----------|
| Intercompany reconciliation (ASAD AR ↔ ASAS AP 4151) | **High** before go-live |
| Product master strategy (shared codes across entities) | Medium |

---

## Files to Request Next

1. **ASAD:** Dec 2025 Sales Tax / Purchase Tax (or confirm 2604 files are not needed for opening).
2. **ASAD:** Inventory valuation workbook or accountant sign-off on 13xx breakdown (especially 1311 สินค้าระหว่างทาง 423,592).
3. **ASAS:** Confirmation that Cost (ด.12) represents Dec closing unit costs — or alternate valuation export.
4. **Both:** AR/AP aging as of 31/12/2025.
5. **Both:** Intercompany balance confirmation (ASAD customer #3 balance vs ASAS 4151).

---

## Safe to Import Later (M2+)

| Item | Entity | Condition |
|------|--------|-----------|
| Opening journal (BS only) | Each | After accountant sign-off |
| Branch / shop master | Each | Mapping CSV approved |
| Product master | Each | Shared code strategy agreed |
| Inventory **quantity** | Each | Subtotals excluded |
| VAT validation data | ASAS | Dec 2512 files |

---

## Must Remain Manual / Control-Balance Only

| Item | Reason |
|------|--------|
| Inventory **value** until cost bridge complete | Gap too large for silent allocation |
| ASAD 1311 in-transit inventory | No matching stock lines identified |
| Related party balances | Requires intercompany agreement |
| Fixed asset subledger | Register ≠ automatic opening |
| Combined inventory pool | **Never** — entities are separate |

---

## Recommended Next Phase

### M2a — ASAD (parallel track)

1. Build inventory valuation candidate v2 from Cost12 / Detail Inventory.
2. Obtain Dec 2025 tax files or document exception.
3. Finance opening import dry-run (no DB until sign-off).

### M2b — ASAS (parallel track)

1. Transform Cost (ด.12) → unit costs on Ending lines.
2. Reconcile stock value to GL 2,268,125.31.
3. Finance opening import dry-run.

### M2c — Intercompany

1. Reconcile ASAD↔ASAS related party balances.
2. Define product code namespace in asa-con-v0 (same code, different company_id).

### Do not proceed

- Merged opening journal across entities
- Merged stock document
- Silent cost allocation to close GL gaps

---

## Artifact Index

### ASAS discovery
- `docs/migration/asas/ASAS_LEGACY_SYSTEM_DISCOVERY.md`
- `docs/migration/asas/ASAS_MIGRATION_READINESS_MATRIX.md`
- `data/migration/asas/discovery/*.csv`

### ASAS M1
- `docs/migration/asas/ASAS_M1_*.md`
- `data/migration/asas/m1/*.csv`

### Combined
- `docs/migration/combined/ASAD_ASAS_INVENTORY_RECONCILIATION.md`
- `data/migration/combined/*.csv`

### ASAD (prior)
- `docs/migration/LEGACY_SYSTEM_DISCOVERY.md`
- `docs/migration/M1_*.md`
- `data/migration/m1/*.csv`

### Script
- `scripts/migration/build-asas-and-combined-package.ts`
