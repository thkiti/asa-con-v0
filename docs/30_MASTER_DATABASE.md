# Master Database (HO_ADMIN maintenance)

Read-only reference: legacy `asa-con` admin product-reference UI. v0 reimplements maintenance in `lib/master/` with thin `app/api/master/*` routes and `components/master/*` pages.

**Status:** Branch, Staff, and Product / ReferenceStock CRUD are **complete** for HO_ADMIN. No schema changes; no changes to import pipelines, stock posting, or finance posting.

## Access

| Surface | Rule |
|---------|------|
| UI | `/master/*` — **HO_ADMIN only** |
| API | `GET/POST/PATCH /api/master/*` — **HO_ADMIN only** (`requireMasterDatabaseSession`) |
| Bulk load | Remains **System Import** (`/system/import`) — not Master Database |

See [05_AUTH_PERMISSIONS.md](./05_AUTH_PERMISSIONS.md) for the role matrix.

## Scope by entity

### Branch CRUD (complete)

| Action | Domain | API |
|--------|--------|-----|
| List (active / trash) | `listBranches` | `GET /api/master/branches` |
| Create | `createBranch` | `POST /api/master/branches` |
| Update | `updateBranch` | `PATCH /api/master/branches/[id]` |
| Soft delete / restore | `deleteBranch` / `restoreBranch` | `PATCH` with `deleted` |

**Bootstrap protection:** `HO999` and `SH999` cannot be deleted (`BOOTSTRAP_BRANCH_PROTECTED`).

**SH001 and other shops:** Normal branches; deletable when not bootstrap codes.

UI: `/master/branch` — [`BranchPage.tsx`](../components/master/branch/BranchPage.tsx).

### Staff CRUD (complete)

| Action | Domain | API |
|--------|--------|-----|
| List | `listStaff` | `GET /api/master/staff` |
| Create | `createStaff` | `POST /api/master/staff` |
| Update / password reset | `updateStaff` / `resetStaffPassword` | `PATCH /api/master/staff/[id]` |
| Soft delete / restore | `deleteStaff` / `restoreStaff` | `PATCH` with `deleted` |

**Guards:** `DEV` reserved; staff `001` protected from delete; `LAST_HO_ADMIN`; bootstrap admin creatable only if absent.

UI: `/master/staff` — [`StaffPage.tsx`](../components/master/staff/StaffPage.tsx).

### Product / ReferenceStock CRUD (complete)

**Model semantics**

| Entity | Role |
|--------|------|
| **Product** | Sellable SKU (`Product.code` immutable after import) |
| **ReferenceStock** | Counting / reference link (hook group, hook no, supplier, product group) tied to one `productId` |

Products are **not** created in Master Database — they come from **System Import**. Master UI maintains name, type, and reference links on existing products.

| Action | Domain | API |
|--------|--------|-----|
| List (product-centric, one primary ref per row) | `listProductReference` | `GET /api/master/product-reference` |
| Update product | `updateProduct` | `PATCH /api/master/products/[productId]` |
| Trash / restore product | `deleteProduct` / `restoreProduct` | `PATCH` with `deleted` |
| Create reference link | `createReferenceStock` | `POST /api/master/product-reference` |
| Update / trash / restore reference | `patchReferenceStock` | `PATCH /api/master/product-reference/[id]` |
| Next hook no (read) | `getNextHookNo` | `GET /api/master/reference-stock/latest-hook-no` |
| Group product lookup (read) | `loadProductByCode` | `GET /api/master/products/by-code` |

UI: `/master/product-reference` — [`ProductReferencePage.tsx`](../components/master/product-reference/ProductReferencePage.tsx), [`ProductReferenceFormModal.tsx`](../components/master/product-reference/ProductReferenceFormModal.tsx).

## Product-Reference rules

### Modal layout (legacy-aligned UX, v0 theme)

1. **Reference Stock** — hook group (K/C/M/O/S), hook no, run, supplier, derived product group, group name (lookup).
2. **Product** — read-only product code; editable name and product type (`TRACKED` / `CONSUMABLE`).

**Product group derivation**

```
productGroup = first 4 digits of Product.code + Run (3 digits, default 900)
```

Example: product code `0101035`, run `900` → product group `0101900`.

- Run `900` = normal group product (expected from import).
- Runs `901`, `902`, etc. = supplier size / variant group codes (e.g. S/L families).
- Group name is **read-only** from `Product` where `code = productGroup`.
- If group product is missing: show **warning**; still allow **Save Product** and **Save All** (no auto-create Product).

**Hook no**

- **New link:** auto-suggest next hook no when hook group is selected; user may override.
- **Existing link:** load current hook no; user may edit (replacement / reuse subject to `@@unique([productId, hookGroup, hookNo])` and domain errors).

### Save actions

| Button | Effect |
|--------|--------|
| **Save Product** | `PATCH` product only (`name`, `productType`) — does not touch `ReferenceStock` |
| **Save All** | `PATCH` product + `POST` or `PATCH` reference fields (`productGroup` from code + run; reference `productCode` = sellable `Product.code`) |

Main **Save** opens a choice overlay (Save Product / Save All / Cancel). **Cancel** closes the modal or dismisses the overlay without saving.

### Trash / restore

| Action | Behavior |
|--------|----------|
| **Row trash (active list)** | Soft-delete **Product** and **all** `ReferenceStock` rows for that `productId` in one transaction |
| **Restore product (trash list)** | `Product.deleted = false` only — references **stay** trashed until explicitly restored or re-linked |
| **Trash Reference Link (modal)** | Soft-delete **one** reference; product stays active |

No physical deletes. Stock input list and posting continue to filter `product.deleted` and `referenceStock.deleted` (unchanged).

### What Master Database does not do

- No `schema.prisma` changes for this feature set
- No import logic changes
- No stock document posting or ledger changes
- No finance / GL posting changes
- No legacy batch `product-ref-save` (prefix-wide reference creation)
- No Product **create** via UI (import only)

## Bootstrap branch codes (import alignment)

| Code | Meaning | Master delete |
|------|---------|-----------------|
| **HO999** | Head Office (bootstrap HO branch) | Protected |
| **SH999** | Temporary Shop / Transfer Buffer (bootstrap shop-side holding branch, not a retail shop) | Protected |
| **SH001** | Normal shop branch (example retail code) | Allowed (not bootstrap) |

Staff import maps `001` → `HO999` / `HO_ADMIN`; other staff → `SH999` / `SH_STAFF` unless branch import assigns otherwise. See `lib/import/constants.ts` and System Import docs.

## Module layout

```
lib/master/           Domain (CRUD, parse, guards, list, mappers)
lib/master-ui/        Fetchers + table classes
app/api/master/       Thin routes
components/master/    Pages + modals + shared row actions
```

Business logic stays in `lib/master/` per [01_MODULAR_MONOLITH_BOUNDARIES.md](./01_MODULAR_MONOLITH_BOUNDARIES.md).

## Related docs

- [05_AUTH_PERMISSIONS.md](./05_AUTH_PERMISSIONS.md) — HO_ADMIN gate for `/master` and `/api/master`
- [09_REFERENCE_DATA_AND_PRODUCT_TYPES.md](./09_REFERENCE_DATA_AND_PRODUCT_TYPES.md) — Product vs ReferenceStock semantics in operations
