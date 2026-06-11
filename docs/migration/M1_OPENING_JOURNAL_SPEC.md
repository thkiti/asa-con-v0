# M1 — Opening Journal Specification

**Effective date:** 01/01/2026  
**Source closing:** 31/12/2025 (`FinReport-202512.xls` → Trial Balance)  
**Output:** `data/migration/m1/opening_journal_candidate.csv`  
**Transform script:** `scripts/migration/build-m1-transform-package.ts`

---

## Objective

Produce a **balanced opening journal** for go-live on 01/01/2026 by:

1. Including all **balance sheet** accounts (equity 1–999, assets 1xxx–3xxx, liabilities 4xxx) with non-zero closing balances  
2. **Excluding** all revenue (5xxx) and expense (6xxx–9xxx) accounts  
3. Closing **net profit 759,468.09** into **Retained Earnings account 301**

---

## Original trial balance (31/12/2025)

| Metric | Amount (THB) |
|--------|--------------|
| Total debit | 8,295,763.67 |
| Total credit | 8,295,763.67 |
| Difference | 0.00 |
| Account rows | 197 |
| Non-zero balance rows | 43 |
| **Balanced** | **Yes** |

**Note:** Raw TB includes **open YTD P&L** — not valid as opening without transform.

---

## P&L close logic

### Accounts excluded from opening

| Range | Type | YTD debit | YTD credit |
|-------|------|-----------|------------|
| 5xxx | REVENUE | 0.00 | 4,044,317.23 |
| 6xxx–9xxx | EXPENSE | 3,285,482.79 | 28,633.65 |
| **Net (credits − debits)** | | | **759,468.09** |

### Retained earnings adjustment

| Item | Amount (THB) |
|------|--------------|
| RE `301` before close | 1,177,300.98 (credit) |
| Net profit 2025 | + 759,468.09 |
| **RE `301` after close** | **1,936,769.07** (credit) |

Formula:

```
Adjusted RE 301 = TB credit 301 + (Σ P&L credits − Σ P&L debits)
                = 1,177,300.98 + 759,468.09
                = 1,936,769.07
```

Cross-check: FinReport equity statement shows unappropriated RE **1,936,769.07** at 31/12/2568.

### Legacy year-end close reference

`AsadData68.xls` posts net profit to account **401** (กำไรสุทธิ) via `GJ-202512`. Opening transform uses **301** per migration policy (single retained earnings bucket).

---

## Adjusted opening journal (01/01/2026)

| Metric | Amount (THB) |
|--------|--------------|
| Journal lines | **26** |
| Total debit | **5,010,280.88** |
| Total credit | **5,010,280.88** |
| Difference | **0.00** |
| **Balanced** | **Yes** |

### Opening lines by category

| Category | Lines | Debit | Credit |
|----------|-------|-------|--------|
| EQUITY | 3 | 0.00 | 4,136,769.07 |
| ASSET (incl. inventory, AR, bank, PPE) | 13 | 4,721,320.88 | 552,866.46 |
| LIABILITY | 10 | 0.00 | 320,645.35 |

### Key lines

| Code | Name | Debit | Credit |
|------|------|-------|--------|
| 1 | ทุนหุ้นสามัญ | — | 2,000,000.00 |
| 101 | สำรองตามกฎหมาย | — | 200,000.00 |
| 301 | กำไร (ขาดทุน) สะสม | — | **1,936,769.07** |
| 1021 | เงินฝากธนาคาร | 908,539.12 | — |
| 1121+1131 | AR | 1,529,072.75 | — |
| 1301–1311 | Inventory GL | 2,007,766.55 | — |
| 2261–2272 | Accum. depreciation | — | 552,866.46 |
| 4101+45xx+46xx | AP & accruals | — | 320,645.35 |

---

## Validation

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Opening debit = credit | Equal | 5,010,280.88 | **PASS** |
| Net profit closed | 759,468.09 | 759,468.09 | **PASS** |
| RE 301 adjusted | 1,936,769.07 | 1,936,769.07 | **PASS** |
| BS assets = opening net assets | 4,457,414.42 | Consistent | **PASS** |

---

## CSV format

```csv
accountCode,accountName,debit,credit,effectiveDate,source
```

- **26 data rows** (non-zero BS balances only)  
- `effectiveDate` = 2026-01-01  
- **Not posted** — candidate only

---

## Can we create Opening Journal today?

**Yes** — candidate file is generated and mathematically balanced.  
**Import/posting** remains blocked until M2 (CoA import + mapping sign-off).

---

## Re-run

```bash
npx tsx scripts/migration/build-m1-transform-package.ts
```
