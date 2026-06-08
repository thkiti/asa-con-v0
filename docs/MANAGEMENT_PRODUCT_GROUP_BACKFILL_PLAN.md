# Management Product Group — Master Data Backfill Plan (Step 1A)

**Date:** 2026-06-08 · **Updated:** 2026-06-08 (master-data correction)  
**Repo:** `asa-con-v0`  
**Status:** Dry-run script ready — **no production data changes approved**  
**Script:** `scripts/seed-management-product-group-backfill.ts` (default dry-run; `--apply` gated)  
**Prerequisite audit:** [MANAGEMENT_PRODUCT_GROUP_AUDIT.md](./MANAGEMENT_PRODUCT_GROUP_AUDIT.md)  
**Code reference:** [PRODUCT CODE ASSIGNED.md](../../asa-con/docs/PRODUCT%20CODE%20ASSIGNED.md)

---

## Purpose

Create summary-level `Product` header rows and `ReferenceStock` links so READ_Z and Stock Document can use [lib/product-groups/management-product-group.ts](../lib/product-groups/management-product-group.ts) with real labels and zero-fill.

**This document does not execute backfill.** It defines the approved approach for a future master-data task.

---

## 1. Missing summary header Products

Audit (2026-06-08): **all 14** policy summary headers are missing as `Product` rows.  
No active `Product` ends with `00900` or `900`. Existing refs use 901/902 variant codes (`0101901`, …).

| # | Code | Label (proposed) | GG / segment | Audit |
|---|------|------------------|--------------|-------|
| 1 | `0100900` | Home Key | GG=01 | 328 refs normalize here |
| 2 | `1100900` | Car Key | GG=11 | 58 refs |
| 3 | `1200900` | Motorcycle Key | GG=12 | 41 refs |
| 4 | `2100900` | Car Safety Head | GG=21 | 89 refs |
| 5 | `2200900` | Motorcycle Safety Head | GG=22 | 58 refs |
| 6 | `3100900` | Special Key | GG=31 | 21 refs |
| 7 | `4100900` | Keys Add-On Sales | GG=41 | 14 sellable SKUs, 0 refs |
| 8 | `5100900` | Ladies' Heels | GG=51 | 72 shoe SKUs (51*), 0 refs |
| 9 | `5500900` | Ladies' Soles | GG=55 | (in shoe set), 0 refs |
| 10 | `6100900` | Men's Heels | GG=61 | (in shoe set), 0 refs |
| 11 | `6500900` | Men's Soles | GG=65 | (in shoe set), 0 refs |
| 12 | `7001900` | Stretching | GG=70, TT=01 | 2 service SKUs (`7001*`) |
| 13 | `7002900` | Glue/Stitching | GG=70, TT=02 | 16 service SKUs (`7002*`) |
| 14 | `8001900` | Shoe Add-On Sales | GG=80 | 9 retail SKUs (`8001001`–`8001009`), 0 refs |

**Not a policy header:** `7003900` (GG=70, TT=03) is **invalid** — do not add to `POLICY_SUMMARY_HEADERS`. Policy count remains **14**.

---

## 2. Proposed Product records

Summary headers are **group-level `Product` rows** (not sellable POS scan targets unless business later decides otherwise). Use existing import / product-code conventions: 7-digit code, `runningCode` = 900 (or 901/902 only for variant headers — summary uses **900** run at positions 5–7).

### Required fields (per row)

| Field | Value |
|-------|--------|
| `code` | Summary header code (table above) |
| `name` | Label (table above) |
| `groupCode` | First 2 digits of `code` |
| `typeCode` | Digits 3–4 of `code` |
| `runningCode` | Digits 5–7 of `code` (900 for `*00900`) |
| `productType` | `TRACKED` (or `CONSUMABLE` if ops prefers non-ledger headers — confirm before apply) |
| `deleted` | `false` |

### Proposed insert set (14 rows)

```text
0100900  Home Key
1100900  Car Key
1200900  Motorcycle Key
2100900  Car Safety Head
2200900  Motorcycle Safety Head
3100900  Special Key
4100900  Keys Add-On Sales
5100900  Ladies' Heels
5500900  Ladies' Soles
6100900  Men's Heels
6500900  Men's Soles
7001900  Stretching
7002900  Glue/Stitching
8001900  Shoe Add-On Sales
```

### Optional (not required for summary rollup)

Existing **901/902 variant header** Products (`0101901`, `0101902`, …) may remain for Master UI / reference maintenance. Summary reporting normalizes them to `GG00900`. Do **not** delete variant headers without ops sign-off.

---

## 3. Idempotent seed strategy

### Product headers

1. **Upsert by `code`** (unique constraint on `Product.code`).
2. For each of the 14 codes:
   - `findUnique({ where: { code } })`
   - If missing → `create` with fields in §2
   - If exists and `deleted: true` → `update` `{ deleted: false, name: <proposed> }`
   - If exists and name differs → **do not overwrite** in automated seed; log for HO review
3. Script must be **re-runnable** (no duplicate creates).
4. Prefer a one-off script under `scripts/seed-management-product-group-headers.ts` (future) or System Import batch — **not** part of Step 1A execution.

### ReferenceStock (keys)

- **No change required** for existing 595 key refs if normalization layer is deployed.
- Optional clarity migration: set `productGroup` to summary code (`0100900`) — only with explicit approval; not required for reporting.

### Validation after Product seed

```sql
SELECT code, name, deleted
FROM "Product"
WHERE code IN (
  '0100900','1100900','1200900','2100900','2200900','3100900',
  '4100900','5100900','5500900','6100900','6500900',
  '7001900','7002900','8001900'
)
ORDER BY code;
-- Expect 14 rows, deleted = false, non-empty name
```

---

## 4. Shoe ReferenceStock backfill strategy

**Current state:** 0 `ReferenceStock` with `hookGroup = 'S'`; 72 shoe `Product` rows without ref.

### Mapping rule (locked)

| Product.code prefix | `ReferenceStock.productGroup` | Summary header (via normalize) |
|--------------------|------------------------------|--------------------------------|
| `51` | `5100900` | `5100900` |
| `55` | `5500900` | `5500900` |
| `61` | `6100900` | `6100900` |
| `65` | `6500900` | `6500900` |

Do **not** use `computeShoeGroupCode` (prefix4 + `900`).

### Per-SKU row template

| Field | Value |
|-------|--------|
| `productId` | Shoe sellable `Product.id` |
| `productCode` | `Product.code` |
| `hookGroup` | `S` |
| `hookNo` | Next available per shop hook ordering (or import sequence) |
| `supplierCode` | `-` (shoe convention) |
| `productGroup` | `5100900` / `5500900` / `6100900` / `6500900` per prefix |
| `deleted` | `false` |

### Idempotent strategy

1. Load all shoe products (`51`, `55`, `61`, `65` prefixes), `deleted = false`.
2. For each product without active `ReferenceStock`:
   - `create` one row with `@@unique([productId, hookGroup, hookNo])` — allocate `hookNo` via `getNextHookNo('S')` or deterministic import order.
3. Skip products that already have active ref with non-null `productGroup`.
4. **Do not** update existing key refs in this pass.

### Add-on / service SKUs (after shoe pass)

| Prefix | `productGroup` | Count (audit) |
|--------|----------------|---------------|
| `41` | `4100900` | 14 |
| `80` | `8001900` | 9 (`8001001`–`8001009`; see §7 reclassification) |
| `70` | TT=01 → `7001900`; TT=02 → `7002900` only | 18 (`7001*` + `7002*`; all `7003*` excluded) |

### 70* service mapping (locked)

| `Product.typeCode` | `ReferenceStock.productGroup` | Summary header |
|-------------------|------------------------------|----------------|
| `01` | `7001900` | `7001900` Stretching |
| `02` | `7002900` | `7002900` Glue/Stitching |
| `03+` | **Do not backfill** | Not in 14-policy catalog |

---

## 7. Master-data corrections — GG=80 reclassification (2026-06-08)

**Business rule:** GG=70 = Services (TT=01 Stretching, TT=02 Glue/Stitching only).  
GG=80 = Shoe Add-On / Retail Items (`80-01-XXX` per [PRODUCT CODE ASSIGNED.md](../../asa-con/docs/PRODUCT%20CODE%20ASSIGNED.md)).

`7003001` / `7003002` / `7003003` are **not services**. Do **not** map to `7001900`, `7002900`, or `7003900`.

### 7.1 `8001xxx` slot audit (live DB)

| Code | Status | Current assignment |
|------|--------|-------------------|
| `8001001` | In use | แผ่นรองพื้นรองเท้า |
| `8001002` | In use | เชือกรองเท้า |
| `8001003` | In use | แผ่นเจลใสรองฝ่าเท้าด้านหน้า |
| `8001004` | In use | แผ่นเจลใสรองใต้ส้นเท้า |
| `8001005` | In use | แผ่นเจลใสกันรองเท้ากัด |
| `8001006` | In use | เจลกลมใสป้องกันการเสียดสี |
| `8001007` | **Repurpose** | ยกเลิก Herbal Insole → `LEATHER INNER-SOLE` |
| `8001008` | **Unused — proposed** | `VINYL INNER-SOLE LADIES` |
| `8001009` | **Unused — proposed** | `VINYL INNER-SOLE MEN` |

### 7.2 Reclassification table (locked for dry-run)

| Retire (GG=70) | Legacy name | Replacement (GG=80) | Replacement name | Action |
|----------------|-------------|---------------------|------------------|--------|
| `7003001` | ยกเลิก VINYL INNERSOLE -LADIES | `8001008` | VINYL INNER-SOLE LADIES | **create** new Product |
| `7003002` | ยกเลิก VINYL INNERSOLE -MEN | `8001009` | VINYL INNER-SOLE MEN | **create** new Product |
| `7003003` | LEATHER-INNERSOLE | `8001007` | LEATHER INNER-SOLE | **repurpose** existing slot |

### 7.3 ReferenceStock after reclassification

| Product.code | `hookGroup` | `productGroup` | Summary header |
|--------------|-------------|----------------|----------------|
| `8001007` | `O` | `8001900` | `8001900` |
| `8001008` | `O` | `8001900` | `8001900` |
| `8001009` | `O` | `8001900` | `8001900` |

All other active `80*` (`8001001`–`8001006`) unchanged → `8001900`.

---

## 5. Validation checklist

Before enabling READ_Z zero-fill or Stock Document label wire-up in production:

- [ ] All **14** summary header `Product` rows exist (`code` + `name`)
- [ ] `loadSummaryHeaderLabels()` returns `labelStatus: "ok"` for all 14
- [ ] Shoe SKUs: each active `51/55/61/65` product has ≥1 `ReferenceStock` with correct `productGroup`
- [ ] Add-on `41*` SKUs: refs point to `4100900`
- [ ] Retail `80*` SKUs: refs point to `8001900` (9 SKUs `8001001`–`8001009`)
- [ ] `7003001` / `7003002` / `7003003` retired; replacements `8001008` / `8001009` created; `8001007` repurposed
- [ ] No refs normalize to headers outside 14-policy catalog (no `7003900`)
- [ ] No `7003*` mapped to `7001900` / `7002900`
- [ ] POS smoke products (`SMOKE-*`, `P1C-*`) excluded or linked intentionally
- [ ] Re-run audit queries from [MANAGEMENT_PRODUCT_GROUP_AUDIT.md](./MANAGEMENT_PRODUCT_GROUP_AUDIT.md)
- [ ] `npm test -- --testPathPatterns=management-product-group` passes
- [ ] Manual: Master UI group lookup finds header for each summary code

---

## 6. Rollback considerations

| Action | Rollback |
|--------|----------|
| Insert 14 header Products | Soft-delete (`deleted = true`) if no `SaleItem` / `StockDocumentLine` references those `productId`s |
| Insert shoe `ReferenceStock` | Soft-delete new ref rows (`deleted = true`) by batch tag / `createdAt` window |
| Optional key `productGroup` migration | Restore from pre-migration CSV snapshot of `ReferenceStock.productGroup` |
| Application code (Step 1B+) | Revert git commit; consumers not wired until later steps |

**Do not** hard-delete Products referenced by historical data.  
Keep a **pre-backfill dump** of `Product` + `ReferenceStock` (read-only export) before first apply.

---

## Execution gate

| Step | Owner | Blocker |
|------|-------|---------|
| Approve this plan | HO / ops | — |
| Create 14 `Product` headers | Master / import | Approval |
| GG=80 reclassification (`7003*` retire, `8001007`–`8001009`) | Master / import | Approval |
| Shoe + add-on + service `ReferenceStock` | Master / import | Header Products + reclassification |
| Wire READ_Z / Stock Document | Engineering | Steps 1B + backfill apply |

**Dry-run:** `npx tsx scripts/seed-management-product-group-backfill.ts` — reports planned mutations only.
