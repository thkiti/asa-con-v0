# Reference Data and Product Types

Status: Planned — architecture only (no schema or code changes in this document)  
Scope: Canonical product semantics and reference-data rules before POS and expanded inventory behaviour  
Related: [04_PRISMA_KERNEL.md](./04_PRISMA_KERNEL.md), [06_STOCK_LEDGER_FOUNDATION.md](./06_STOCK_LEDGER_FOUNDATION.md), [08_POS_CHECKOUT_ARCHITECTURE.md](./08_POS_CHECKOUT_ARCHITECTURE.md)

---

## 1. Purpose

Phase 5 POS checkout and later purchasing/reporting flows need **one shared definition** of what a product is and whether it participates in inventory. Without this, `ProductType` checks scatter across UI, routes, and ad hoc conditionals — breaking ledger boundaries and report consistency.

### Goals

| Goal | Description |
|------|-------------|
| Canonical product semantics | Single meaning for each `ProductType` across stock, POS, documents, finance |
| Inventory behaviour by type | Which types call `issueStock()` / `receiveStock()`, which skip ledger entirely |
| Shared rules | Same policy in posting, checkout, validation, and reporting |
| Reference-data clarity | What `Product`, `ReferenceStock`, and code dimensions mean — and what they do **not** mean |

### Non-goals (this document)

Schema migrations, new enums in Prisma, and implementation of `lib/products/**` are **not** done here. This document locks policy before Phase 5 code expands inventory behaviour.

---

## 2. ProductType definitions

### Current kernel (Phase 1 schema)

Prisma enum today: **`TRACKED`**, **`CONSUMABLE`** only ([`prisma/schema.prisma`](../prisma/schema.prisma)).

### Planned extensions (architecture — migrate in dedicated phase)

| Value | Status | Summary |
|-------|--------|---------|
| `SERVICE` | **Planned** | Revenue-only; never mutates stock |
| `NON_STOCK` | **Optional / alias** | Catalog line with no inventory intent; may merge with `SERVICE` or `CONSUMABLE` policy — decide at enum migration |

Future types (bundles, serialized SKU, etc.) extend this document — **never** hard-code behaviour only in UI.

---

### 2.1 `TRACKED`

Physical inventory SKU tracked per branch through the ledger.

| Domain | Behaviour |
|--------|-----------|
| **Stock mutation** | **Always via ledger** — `receiveStock()` inbound, `issueStock()` outbound |
| **POS** | Every sellable line → `issueStock()` with positive qty; negative on-hand allowed |
| **Purchasing / documents** | Eligible on PURCHASE, TRANSFER_IN/OUT, ADJUSTMENT, PERFORMANCE via `posting.ts` mapping |
| **Reporting** | Included in stock qty, valuation (FIFO/avg), movement reports, variance counts |

---

### 2.2 `CONSUMABLE`

Sold or used items where **POS sale does not decrement ledger qty**, but the SKU may still exist in product master for pricing and revenue.

| Domain | Behaviour |
|--------|-----------|
| **Stock mutation** | **Default: skip ledger on POS sale** — explicit, auditable skip (see §3.3). Optional HO receipt via documents TBD — if received, uses ledger at posting time only when policy enables |
| **POS** | Sellable; records `SaleItem` revenue; **no** `issueStock()` call |
| **Purchasing** | May appear on PURCHASE lines; default policy: **no** automatic `receiveStock()` unless product flagged for branch consumable stock (future flag) |
| **Reporting** | Sales revenue yes; stock on-hand reports **exclude** or show zero movement from POS; consumable COGS from configured rule (avg snapshot, fixed cost, or manual) — not from FIFO issue at sale |

> **Reference note:** Legacy POS sets `SaleItem.cost` from `Stock.avgCost` when a row exists, without issuing stock. v0 may adopt read-only cost lookup for CONSUMABLE — still **no** ledger mutation at sale.

#### CONSUMABLE receipt / inbound policy (if ever enabled)

If CONSUMABLE **receipt or inbound stock** is enabled in a future phase (e.g. PURCHASE POST calling `receiveStock()` for branch consumable stock):

- The policy **must remain centralized** in `lib/products/product-type-rules.ts` (and document posting validation) — not decided per screen or route.
- The behaviour **must be explicit** in this document’s participation matrix (§5) before any code ships.
- Every inbound path **must be auditable** via `StockTransaction` rows (same ledger rules as TRACKED inbound).
- **Never** implement ad-hoc CONSUMABLE receipt in a single UI action, API route, or one-off script without updating central policy and the matrix.

Until that policy is approved and documented, default remains: **no CONSUMABLE inbound ledger** at posting or checkout.

---

### 2.3 `SERVICE` (planned enum)

Labour, fees, keys cut service charge, etc. — **no inventory dimension**.

| Domain | Behaviour |
|--------|-----------|
| **Stock mutation** | **Never** — no `Stock`, `StockLayer`, or `StockTransaction` for this type |
| **POS** | Sellable; revenue on `SaleItem` only; no `issueStock()` |
| **Purchasing** | Not on stock documents; expenses via finance (future), not PURCHASE stock lines |
| **Reporting** | Service revenue category; excluded from inventory valuation and stock summary |

---

### 2.4 `NON_STOCK` (planned / optional)

Placeholder for catalog entries that are neither tracked nor consumable in the operational sense (e.g. narrative line, deposit line).

| Domain | Behaviour |
|--------|-----------|
| **Stock mutation** | Never |
| **POS** | May be sellable or display-only — policy TBD; default same as `SERVICE` |
| **Purchasing** | Not on inventory documents |
| **Reporting** | Revenue if sold; no stock metrics |

**Recommendation:** Prefer **`SERVICE`** for most non-stock sales; add `NON_STOCK` only if business requires a distinct reporting class.

#### ProductType expansion warning

- **Avoid enum proliferation** without a distinct row in the participation matrix (§5). If two types behave identically for stock, POS, purchasing, and reporting, use one enum value.
- **Every new `ProductType` must justify different inventory and/or reporting behaviour** — document the delta before proposing a schema change.
- **Update the participation matrix (§5) and central policy module first**, then implement. No “add enum now, define behaviour later.”
- Enum migration is a separate approved step — behaviour doc precedes code.

---

### 2.5 Future / extensible notes

| Future type | Inventory | Notes |
|-------------|-----------|-------|
| `BUNDLE` / kit | Derived from components | Explodes to component `TRACKED` lines at checkout/post |
| `SERIALIZED` | TRACKED + serial FK | One ledger row per serial unit |
| `ASSEMBLY` | BOM explosion | Manufacturing phase |
| Variant (size/color) | Separate `Product` rows or variant table | Identity rules in product master |

New types require: matrix update (§5), central policy module update, architecture doc amendment, migration plan — see **ProductType expansion warning** under §2.4.

---

## 3. Core invariants

| # | Invariant |
|---|-----------|
| 1 | **`TRACKED` products always use the ledger** for stock-affecting events (document POST, POS sale, future refund receive) |
| 2 | **POS `TRACKED` lines always call `issueStock()`** — positive magnitude; never `receiveStock()` at checkout |
| 3 | **`CONSUMABLE` ledger skip must be explicit and auditable** — e.g. `SaleItem` records `productType`, no silent omission; optional audit log / reason code |
| 4 | **`SERVICE` (and default `NON_STOCK`) never mutate stock** — no Stock row creation side effects at sale |
| 5 | **`ProductType` meaning is centralized** — one module (planned `lib/products/product-type-rules.ts` or `lib/shared/product-behavior.ts`); UI/routes call helpers, not raw string compares scattered everywhere |
| 6 | **No signed qty** — direction chosen by `issueStock` vs `receiveStock` |
| 7 | **No `posting.ts` in POS** — product type does not change that boundary |

### 3.1 Central policy module (planned)

```
lib/products/
├── product-type-rules.ts   # participatesInLedger(), isSellable(), isPurchasable(), …
├── product-types.ts        # re-export ProductType + planned values
└── README.md
```

Until implemented, **this document** is the authority; Phase 5 must not scatter `if (productType === "TRACKED")` in React pages.

### 3.2 Auditing CONSUMABLE skip

When checkout skips ledger for CONSUMABLE:

- `SaleItem` persists `productId` + product type snapshot (or join to `Product`)
- No `StockTransaction` for that line — expected state
- Reports filter: sales include line; stock movement excludes line

Optional future: `SaleItem.ledgerSkippedReason = "CONSUMABLE"` for audit exports.

---

## 4. Reference data boundaries

### 4.1 Product master (`Product`)

**Canonical product identity** for the system.

| Field | Role |
|-------|------|
| `id` | Stable FK everywhere |
| `code` | Unique business SKU string (display, POS scan, documents) |
| `groupCode`, `typeCode`, `runningCode` | Internal classification / code generation (`@@unique([groupCode, typeCode, runningCode])`) |
| `name` | Display name |
| `productType` | **Inventory participation policy** (§2) |
| `deleted` | Soft delete — hide from pickers; retain history |

**Owner:** Admin / product maintenance (future `lib/products/` or admin API). Not owned by POS or stock-document modules.

### 4.2 ReferenceStock

**Supplier / hook / legacy mapping layer** — not the canonical SKU.

| Field | Semantics |
|-------|-----------|
| `productId` | FK → `Product` (many ReferenceStock rows per product allowed: `@@unique([productId, hookGroup, hookNo])`) |
| `hookGroup` | Display/sort family (reference: K, C, M, O, S — key, consumable, machinery, other, shoe) |
| `hookNo` | Order within hook group |
| `supplierCode` | Supplier’s code for procurement reference |
| `productCode` | Redundant/auxiliary code string for imports |
| `productGroup` | Supplier-facing group label (string) — **not** the same as `Product.groupCode` int |

**Owner:** Reference data imports / admin. Used for pickers, sorting, supplier docs — **not** for ledger direction or qty.

### 4.3 ProductGroup

v0 kernel has **no** separate `ProductGroup` model.

| Concept | Where it lives |
|---------|----------------|
| Internal product group | `Product.groupCode` (+ `typeCode`, `runningCode`) |
| Supplier product group | `ReferenceStock.productGroup` |
| Future normalized group table | Deferred — would FK from `Product` or `ReferenceStock` |

Do not conflate `groupCode` with `ReferenceStock.productGroup` in business logic.

### 4.4 supplierCode

Lives on **`ReferenceStock`**, not `Product`. Purchasing UI may display supplier code via join; canonical checkout/document lines use **`productId`**.

### 4.5 hookGroup / hookNo semantics

- **Purpose:** Sort order and grouped pickers (stock document grids, product lists).
- **Not** inventory keys — ledger keys are `(branchId, productId)`.
- Multiple hooks per product support multi-supplier or multi-shelf presentation.

### 4.6 Who owns canonical product identity?

| Question | Answer |
|----------|--------|
| What is sold at POS? | `Product.id` / `Product.code` |
| What moves in ledger? | `Product.id` where `productType` policy says ledger participates |
| What appears on supplier PDF? | `ReferenceStock` fields + `Product.code` |
| Source of truth for type | `Product.productType` only |

---

## 5. Inventory participation rules

Matrix for **default v0 policy** (before bundle/serial extensions):

| ProductType | `Stock` row | `StockLayer` | `StockTransaction` | Purchasable (stock docs) | Sellable (POS) | Transferable |
|-------------|-------------|--------------|-------------------|--------------------------|----------------|--------------|
| `TRACKED` | Yes | Yes | Yes | Yes | Yes | Yes |
| `CONSUMABLE` | Optional read for cost | No issue at sale | No at POS sale; optional at POST if policy enables receipt | Limited / policy | Yes | Default **No** (reference governance: reject CONSUMABLE transfer) |
| `SERVICE` (planned) | No | No | No | No | Yes | No |
| `NON_STOCK` (planned) | No | No | No | No | TBD | No |

**Legend:**

- **Purchasable:** may appear on PURCHASE / TRANSFER_IN document lines (validation enforces type rules at posting).
- **Transferable:** TRANSFER_OUT / TRANSFER_IN / PERFORMANCE document eligibility.
- Empty cells mean "not applicable" or "no by default."

### 5.1 Document posting interaction

| Type | `postDocument()` ledger |
|------|-------------------------|
| `TRACKED` | Maps lines to `issueStock` / `receiveStock` per doc type |
| `CONSUMABLE` | Default skip or reject on transfer docs; PURCHASE receipt optional future |
| `SERVICE` | Reject on stock documents |

Posting validation (future enhancement) should call `product-type-rules` — not duplicate matrix in `validation.ts` long term.

---

## 6. POS interaction rules

Aligned with [08_POS_CHECKOUT_ARCHITECTURE.md](./08_POS_CHECKOUT_ARCHITECTURE.md).

| Rule | Detail |
|------|--------|
| `TRACKED` | Outbound only — `issueStock({ qty: positive })` per line |
| `CONSUMABLE` | Sell without `issueStock()` — auditable skip |
| `SERVICE` / `NON_STOCK` | No inventory movement |
| Signed qty | **Forbidden** — magnitude + function choice |
| `posting.ts` | **Never** called from POS |
| Insufficient stock | **Do not block** `TRACKED` sale — ledger allows negative |
| Cart / SAVE | No stock mutation until checkout commits |

### 6.1 Checkout mapping (recap)

```typescript
// Conceptual — lives in lib/pos/checkout.ts + product-type-rules
for (const line of cart) {
  if (participatesInLedgerAtSale(line.productType)) {
    issueItems.push({ productId, qty: absQty, lineId: saleItem.id })
  }
}
await issueStock({ tx, items: issueItems, refType: "POS_SALE", refId: sale.id, … })
```

`participatesInLedgerAtSale()` returns **true** only for `TRACKED`.

### 6.2 Checkout orchestration (atomic owner)

Only **`lib/pos/checkout.ts`** may atomically orchestrate, inside **one** outer `prisma.$transaction`:

1. Create **`Sale`**
2. Create **`SaleItem`** rows
3. Call **`ledger.issueStock()`** for eligible `TRACKED` lines (same `tx`)
4. Create **`Payment`**
5. Create **`Receipt`**

Helper modules (`validation.ts`, `payment.ts`, `receipt.ts`) **must remain subordinate** — pure validation or single-row writers invoked by `checkout.ts`. They must **not** open their own transactions, call `issueStock()` independently, or commit partial checkout state. See [08_POS_CHECKOUT_ARCHITECTURE.md](./08_POS_CHECKOUT_ARCHITECTURE.md) §5–6.

### 6.3 Receipt identity (not inventory)

- **`receiptNo`** is **business-facing only** — customer/shop receipt numbering.
- It is **not** an inventory identity, **not** a ledger identity, and **not** a substitute for `Product.id` or `StockTransaction.id`.
- **Never** use `receiptNo` (or `Receipt.id` alone) as stock linkage — ledger traceability uses `refType` / `refId` (`sale.id`) / `refLineId` (`saleItem.id`) on `StockTransaction`.
- Joining sales to inventory reports goes through **`Sale.id` → `StockTransaction.refId`**, not through receipt number.

---

## 7. Reporting implications

### 7.0 Source of truth (inventory vs sales)

| Dimension | Source of truth | Must not use as inventory truth |
|-----------|-------------------|--------------------------------|
| **Inventory qty, movement, valuation** | `StockTransaction` (+ `Stock` snapshot) via ledger | `SaleItem`, `Sale`, `Receipt`, POS cart rows |
| **Sales revenue, tender, receipt** | `Sale` / `SaleItem` / `Payment` / `Receipt` | Inferring stock on-hand from sales rows alone |

**Rules:**

- **Inventory truth derives from the ledger** — reports that show on-hand, movement, FIFO value, or variance **must** query `StockTransaction` (and related `Stock` / `StockLayer`), not sum or infer from POS sale lines.
- **Sales and inventory are related but separate reporting dimensions** — relate them via explicit joins (`StockTransaction.refId` = `Sale.id`, `refLineId` = `SaleItem.id`, `refType` = `POS_SALE`), never by assuming every sale line has a ledger row or every ledger row has a sale.
- **`CONSUMABLE` / `SERVICE` sales without ledger rows are expected** — do not “fix” reports by writing stock from sale data.

### 7.1 Stock summary

- Includes **`TRACKED`** qty and value from `Stock` + `StockTransaction`.
- **Excludes** `SERVICE` / `NON_STOCK`.
- **`CONSUMABLE`:** exclude POS sales from movement; optional static qty if HO policy maintains consumable stock.

### 7.2 Sales summary

- All sellable types contribute **revenue** (`Sale` / `SaleItem`).
- Split by `productType` dimension for management reports.

### 7.3 Valuation

- **TRACKED:** FIFO layers + moving average via ledger.
- **CONSUMABLE:** COGS from configured rule at sale time — not FIFO issue unless policy changes.
- **SERVICE:** revenue only; no COGS from inventory (direct expense category future in finance).

### 7.4 Consumable handling

Reports must not assume every `SaleItem` has a matching `StockTransaction.qtyOut`. Join sales to ledger with **left join** on `refLineId` / `productId`, filter by type.

### 7.5 Service revenue handling

Dedicated service revenue bucket — no double-count in inventory turnover metrics.

### 7.6 One summary path (future)

Screen, print, and PDF inventory summaries share `lib/stock/summary.ts` — filter by `ProductType` via central rules ([01_MODULAR_MONOLITH_BOUNDARIES.md](./01_MODULAR_MONOLITH_BOUNDARIES.md)).

---

## 8. Future notes

| Topic | Direction |
|-------|-----------|
| **Bundles / kits** | Header product explodes to component `TRACKED` lines at checkout; bundle itself `NON_STOCK` or virtual |
| **Assemblies / BOM** | Manufacturing document type; component issue/receive |
| **Serialized inventory** | `Serial` model + one-to-one with layer or transaction line |
| **Size / colour variants** | Separate `Product` rows or `ProductVariant` table; type policy inherited |
| **Supplier-specific mappings** | Extra `ReferenceStock` rows; never override `Product.productType` per supplier |
| **Enum migration** | Add `SERVICE` / `NON_STOCK` via Prisma migration + backfill script + matrix update |

---

## 9. Not allowed

| Anti-pattern | Why |
|--------------|-----|
| Hard-coded `ProductType` checks scattered in UI components | Drift from policy; untestable |
| Inline FIFO / `stock.update` in POS page or route | Violates ledger boundary ([ARCHITECTURE_GUARDS.md](./ARCHITECTURE_GUARDS.md)) |
| Bypassing ledger for **`TRACKED`** items | Breaks audit trail |
| Using `ReferenceStock.hookGroup` to infer ledger direction | Wrong layer — use `Product.productType` |
| Silent CONSUMABLE skip without sale line record | Not auditable |
| Ad-hoc CONSUMABLE inbound receipt per screen/route | Must use centralized policy (§2.2) |
| Using `receiptNo` as stock or ledger linkage | Wrong identity layer (§6.3) |
| Helper module orchestrating full checkout or calling `issueStock()` alone | Violates §6.2 |
| POS calling `postDocument()` or touching `StockDocument` | Domain separation |

---

## 10. Acceptance criteria

Phase 5+ implementation aligned with this doc when:

- [ ] `ProductType` semantics documented and agreed (this document reviewed)
- [ ] **`TRACKED` policy locked:** always ledger on stock events; POS always `issueStock()`
- [ ] **`CONSUMABLE` skip explicit** at POS with auditable sale lines
- [ ] **`SERVICE` / `NON_STOCK`** planned behaviour documented before enum migration
- [ ] Central **`product-type-rules`** module planned or implemented — no scattered UI checks
- [ ] POS, posting, and reporting docs cross-reference this matrix (§5)
- [ ] Reference data roles clear: `Product` = identity; `ReferenceStock` = mapping only
- [ ] **Reporting source-of-truth rule (§7.0)** understood — inventory from ledger, sales from sale tables
- [ ] **Checkout orchestration (§6.2)** — only `checkout.ts` owns atomic sale + ledger commit
- [ ] **Receipt identity (§6.3)** — `receiptNo` not used for stock linkage

**This document does not require schema changes to be "accepted"** — enum additions are a separate approved migration.

---

## Related docs

- [04_PRISMA_KERNEL.md](./04_PRISMA_KERNEL.md) — current `Product`, `ReferenceStock`, `ProductType`
- [06_STOCK_LEDGER_FOUNDATION.md](./06_STOCK_LEDGER_FOUNDATION.md) — ledger API
- [07_STOCK_DOCUMENT_POSTING.md](./07_STOCK_DOCUMENT_POSTING.md) — document posting
- [08_POS_CHECKOUT_ARCHITECTURE.md](./08_POS_CHECKOUT_ARCHITECTURE.md) — checkout flow
- [ARCHITECTURE_GUARDS.md](./ARCHITECTURE_GUARDS.md) — audit patterns
- Reference: `asa-con/app/api/pos/checkout/route.ts` (CONSUMABLE branch), `asa-con/docs/08_stock-governanace-v1.md`

---

**Implementation requires explicit approval after this document is reviewed.**
