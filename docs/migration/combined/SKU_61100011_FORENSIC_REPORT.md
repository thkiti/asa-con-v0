# SKU 61100011 (GALAXY HEEL) — Forensic Report

**Project:** asa-con-v0  
**Date:** 2026-06-11  
**Scope:** Investigation only — no migration output, code, or DB changes

**SKU:** 61100011  
**Description:** GALAXY HEEL  
**GL category:** 1303 วัสดุรองเท้า  
**Variance under review:** **1,207.73 THB** (100% of remaining ASAD inventory GL bridge variance)

---

## Executive Summary

| Source | 31/12/2025 ending qty | 31/12/2025 ending amount |
|--------|----------------------|--------------------------|
| **2025-61100011.xlsx** (stock card) | **408** | **16,425.16** |
| **ASAD_Inventory202512.xls** / Cost12 | **408** | **16,425.16** |
| **FinReport-202512.xls** TB (via 1303) | — | **16,425.16** (SKU share of 921,940.13) |
| **Stock-2025-ASAD.xlsx** / Cost12 row 69 | **408** | **17,632.89** ❌ |

**Correct migration value:** **16,425.16** at qty **408** (use **16,425.16** for opening value; qty per Ending sheet).

**Root cause:** Stock-2025-ASAD consolidated Cost12 carries **October 2568 ending amount (17,632.89)** into **November/December ending amount columns** without applying **30 unit November issues**. The per-SKU stock card, legacy inventory export, and audited FinReport TB all agree on **16,425.16**.

**Variance status:** **Resolved forensically** — no unexplained residual. M2 may proceed using GL/legacy/stock-card value; brief accountant sign-off recommended.

---

## Part A — Ending Balance Trace (31/12/2025)

### Source: `2025-61100011.xlsx`

| Field | Value |
|-------|-------|
| **Year-end row** | **Row 191** — label `ยอดสินค้าคงเหลือ/ต้นทุนใช้ (Usage) :` |
| **Ending quantity** | **408** (stored 407.999999999 — floating precision) |
| **Unit cost** | **40.2577** THB/unit (weighted average) |
| **Ending amount** | **16,425.157614384156** → **16,425.16** rounded |

Supporting December section:

| Row | Role | Qty | Unit cost | Amount |
|-----|------|-----|-----------|--------|
| 176 | December opening (carried from Nov) | 408 | 40.2577 | 16,425.16 |
| 189 | Month summary | 408 | — | 16,425.16 |
| **191** | **Year-end balance line** | **408** | — | **16,425.16** |

Formula on **Q191**: `=Q189` (references row 189 summary — **formula-driven**, not manual override).

---

## Part B — Monthly Movement Trace

Full trace: `data/migration/combined/sku_61100011_monthly_trace.csv`

### Stock card month-by-month (authoritative movement)

| Month | Open qty | Open amt | Issues | End qty | End amt (stock card) |
|-------|----------|----------|--------|---------|----------------------|
| มกราคม | 721 | 29,025.83 | 35 | 686 | 27,616.81 |
| กุมภาพันธ์ | 686 | 27,616.81 | 20 | 666 | 26,811.65 |
| … | … | … | … | … | … |
| **ตุลาคม** | 463 | 18,639.33 | 25 | **438** | **17,632.89** |
| **พฤศจิกายน** | 438 | 17,632.89 | **30** | **408** | **16,425.16** |
| **ธันวาคม** | 408 | 16,425.16 | ~0 | **408** | **16,425.16** |

### First month of divergence: Stock-2025 vs legacy / FinReport

| Month | Stock-2025 amt | Legacy Cost12 / stock card | Difference |
|-------|----------------|---------------------------|------------|
| ตุลาคม | 17,632.89 | 17,632.89 | **0.00** |
| **พฤศจิกายน** | **17,632.89** | **16,425.16** | **+1,207.73** |
| ธันวาคม | 17,632.89 | 16,425.16 | **+1,207.73** |

### When variance originated

| Period | Finding |
|--------|---------|
| Before 2025 | Not in scope — 2025 stock card opens from 12/4/23 JV |
| Jan–Oct 2568 | Stock card and consolidated reports aligned through **October** ending **17,632.89** (qty 438) |
| **Nov 2568** | **30 issues** reduce qty 438→408 and amount 17,632.89→**16,425.16** on stock card; **Stock-2025 fails to update amount** |
| Dec 2568 close | Stock card and legacy Cost12 confirm **16,425.16**; Stock-2025 still shows **17,632.89** |

**Arithmetic check:** 30 issues × ~40.2577 unit cost ≈ **1,207.73** — exactly the variance.

---

## Part C — Formula Audit

### `2025-61100011.xlsx`

| Check | Result |
|-------|--------|
| Ending amount calculated? | **Yes** — `Q191 = Q189`, `Q176 = O176*P176` |
| Manually entered? | **No** on year-end line |
| Hard-coded overrides? | **None** on Dec closing rows |
| Circular references? | **None detected** |
| Rounding adjustments? | Minor float (407.999999999 qty) |
| Hidden rows? | **No** |
| Hidden sheets? | **No** (1 visible sheet) |
| **Verdict** | **Formula-driven** — **HIGH** confidence |

### `Stock-2025-ASAD.xlsx` row 69

| Check | Result |
|-------|--------|
| Nov/Dec ending cells (I69, J69, K69) | **Plain numeric values — no formulas** |
| Values | J69 qty **408**, K69 amt **17,632.89** (stale) |
| **Verdict** | **Static export / manual snapshot error** — **HIGH** confidence |

---

## Part D — Source-of-Truth Ranking (SKU 61100011 only)

| Rank | Source | Value (THB) | Reliability | Reason |
|------|--------|-------------|-------------|--------|
| 1 | **FinReport TB → 1303** | **16,425.16** (SKU portion) | **HIGH** | Audited year-end financial statements; GL posted balance |
| 2 | **2025-61100011.xlsx** stock card | **16,425.16** | **HIGH** | Full 2025 movement audit trail; formula-driven Dec close row 191 |
| 3 | **ASAD_Inventory202512.xls** Cost12 | **16,425.16** | **HIGH** | Matches stock card Nov/Dec; same export family as FinReport close |
| 4 | Balance Sheet (FinReport) | Consistent with TB 1303 | **HIGH** | TB/BS cross-check |
| 5 | **Stock-2025-ASAD.xlsx** | **17,632.89** | **LOW** | Stale October amount in Nov/Dec columns; contradicts stock card and GL |

---

## Part E — Variance Classification

**Selected: F — Data entry / export error** (with element of **stale carry-forward**)

### Evidence

1. Stock card **November row 174** correctly records 30 issues and ending **16,425.16**.
2. Stock card **October row 159** ending **17,632.89** (qty 438) is exactly the value Stock-2025 incorrectly retains.
3. Stock-2025 row 69 has **no formulas** — static values not refreshed after November movement.
4. Legacy `ASAD_Inventory202512.xls` and FinReport TB agree with stock card, not Stock-2025.
5. Variance = 30 units × 40.2577 ≈ 1,207.73 — matches unapplied November cost of goods issued.

**Not selected:**

| Class | Why not |
|-------|---------|
| A. Cost revision not posted to GL | GL has the **lower correct** value; Stock-2025 is **higher** |
| B. Manual stock card adjustment | Stock card is formula-driven and consistent |
| C. Auditor adjustment | No evidence of TB override for this SKU |
| D. Costing method difference | Same unit cost ~40.2577 across correct sources |
| G. Unknown | Fully explained |

---

## Part F — Migration Recommendation

### Opening 01/01/2026 — which value?

| Value | Verdict |
|-------|---------|
| **16,425.16** | **IMPORT** ✅ |
| 17,632.89 | **DO NOT IMPORT** ❌ |

### Justification

- **Audit trail:** Stock card row 191 + Dec movement rows 176–189.
- **Financial statements:** FinReport TB account 1303 built from **16,425.16** SKU contribution.
- **Cost records:** Weighted average **40.2577**/unit × 408 qty = 16,425.16.

### Product row handling

| Field | Recommendation |
|-------|----------------|
| productCode | 61100011 |
| qty | 408 (from Ending sheet / stock card) |
| unitCost | 40.2577 (derived) |
| inventoryValue | **16,425.16** |
| sourceSheet | `2025-61100011.xlsx` row 191 / `ASAD_Inventory202512.xls` Cost12 row 69 |
| exclude Stock-2025 amount | Yes — superseded |

---

## Required Conclusion

| # | Answer |
|---|--------|
| 1. **Correct migration value** | **16,425.16** THB (qty **408**, unit cost **~40.2577**) |
| 2. **Root cause of 1,207.73** | Stock-2025-ASAD Cost12 row 69 retained **October ending amount 17,632.89** after **30 November issues** reduced the correct balance to **16,425.16** |
| 3. **Variance resolved?** | **Yes** — forensically fully explained; no residual |
| 4. **M2 can proceed?** | **Yes** — use FinReport TB / legacy Cost12 / stock card; exclude Stock-2025 amount for this SKU |
| 5. **Accountant review required?** | **Minimal** — confirm FinReport TB 1303 = 921,940.13 remains authoritative; optional one-line memo that Stock-2025 row 69 is superseded |

---

## Artifacts

| File | Purpose |
|------|---------|
| `data/migration/combined/sku_61100011_monthly_trace.csv` | Month-by-month movement + divergence flags |
| `scripts/migration/trace-sku-61100011.ts` | Read-only trace generator (investigation) |

**Evidence paths:**

- `O:/asa-con/account/asad/Stockcard2025/2025-61100011.xlsx`
- `O:/คุณกิติ/stock2025/Stock-2025-ASAD.xlsx` (row 69)
- `O:/asa-con/account/asad/ASAD_Inventory202512.xls` (Cost12 row 69)
- `O:/asa-con/account/asad/FinReport-202512.xls` (TB 1303)
