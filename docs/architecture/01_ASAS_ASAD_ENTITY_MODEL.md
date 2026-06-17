# ASAS / ASAD Entity Model

Project: `asa-con-v0`  
Status: Active  
Prerequisite overview: [00_ARCHITECTURE_OVERVIEW.md](./00_ARCHITECTURE_OVERVIEW.md)

---

## 1. Entities are not applications

ASAS and ASAD are **legal entities** in the same corporate group. They had separate legacy ERP folders and closing books; in `asa-con-v0` they share one system.

| Code | Display name | Business focus |
|------|--------------|----------------|
| `AS` | ASAS | Retail, services, POS, shops, customer operations |
| `AD` | ASAD | Import, purchasing, material ownership, distribution to ASAS |

Runtime constants: `lib/legal-entity/constants.ts`  
Session and document rules: `lib/legal-entity/document-entity.ts`

---

## 2. One system, shared masters, separated documents

### Shared (single master, both entities)

- Branch / office
- Staff
- Product master
- Reference stock links
- Supplier and customer references
- HO operational users

### Separated (per `legalEntityCode`)

- Vouchers and journal entries
- Accounting periods (close / reopen per entity)
- Financial statements and tax reporting
- Stock documents where ownership and valuation are entity-specific
- Opening balance and migration import batches

### Core invariant

> **Branch / location ≠ document owner**

`HO999` may create both `AS` and `AD` documents. Legal entity is stored on the document header (`legalEntityCode`), not inferred from branch alone. Session `documentEntityCode` is the **working default for new documents** only; changing session after login does not rewrite existing documents.

HO finance/admin at `HO999` may toggle entity at login or in session. Shop staff and non-HO branches are forced to `AS`.

---

## 3. How differences are expressed (without duplicating code)

| Concern | Mechanism |
|---------|-----------|
| **Entity code** | `LegalEntity.code` (`AS` \| `AD`); persisted on finance and stock headers |
| **Document numbering** | Entity-neutral format (e.g. `MAJ-260001`, `OPB-260001`); entity is a separate field — never `ASAS-MAJ-260001` |
| **Company identity** | `LegalEntity.name`, `address`, `taxId` for reports and statutory print |
| **Letterhead / receipt** | Receipt setup (`ReceiptPrintSettings`), branch tax IDs; ASAS shop receipts use company tax ID from `HO999` |
| **Permissions** | Role matrix in `lib/permissions/` plus entity gates on menu, pages, and APIs |

Implement once; branch and entity guards select behavior.

---

## 4. Identity leakage risk

**Identity leakage** means ASAS data, branding, or accounting appearing in an ASAD context (or the reverse) because shared infrastructure was treated as shared ownership.

### High-risk areas

| Area | Leakage scenario | Required control |
|------|------------------|------------------|
| Finance reports | Trial balance / GL without entity filter | Require `legalEntityCode` (or explicit consolidated mode) on every report query |
| Accounting periods | Global period close affects both companies | Period unique per `(legalEntityCode, periodKey)` |
| Shop / POS | ASAD session opens sales dashboard | Entity gate on menu, page, and API |
| Stock valuation | AD and AS opening stock in one import file | Batch-level entity required; reject mixed entity |
| Receipt / tax print | Wrong company tax ID on slip | Resolve identity from entity + branch rules at print time |
| Historical reads | Filter by current session entity | Always use persisted document `legalEntityCode` |

### Design rules

1. Persist entity on every legal-entity-sensitive document at create time.
2. Never use session entity alone when listing or reporting historical data.
3. Gate ASAS-only modules at menu, route, page, and API layers.
4. Do not use `Branch` as the sole source of legal ownership.
5. Add tests for AS-only, AD-only, and denied cross-entity access when exposing new features.

Example (implemented): Last Month / Actual Sales is hidden and blocked for `AD` via `canAccessShopSalesDashboard()` in `lib/permissions/sales-dashboard.ts` and menu builder in `lib/main-ui/main-menu.ts`.

---

## 5. Module classification

### 5.1 ASAS-only modules

These modules exist because ASAS operates retail shops and POS. ASAD does **not** run shop sales or full POS. They must not appear in ASAD menus, routes, or backend queries.

| Module | Notes |
|--------|-------|
| **Full POS** | Checkout, stock issue, shop terminal — always entity `AS` |
| **Shop Sales** | HO shop sales views and aggregates |
| **Target Sales** | Monthly target setup per branch |
| **Last Month / Actual Sales** | Target vs actual dashboard (`/shop/target-sales`) |
| **Work Time** | Shop staff time in/out |
| **Receipt** | POS abbreviated tax invoice |
| **Refund** | POS refund flow |
| **READ_Z** | Daily Z-read / shop closing slip |
| **Payment Evidence** | Bank transfer / payment slip capture at POS |

POS and shop paths force `legalEntityCode = AS` regardless of HO entity toggle.

### 5.2 Shared / entity-based modules

Same implementation for both entities; scope by `legalEntityCode`, role, and workflow rules.

| Module | Entity behavior |
|--------|-----------------|
| **Product & Reference Stock** | Shared master; both entities consume |
| **Stock Documents** | Entity on document header; SHOP/POS docs always `AS` |
| **Stock Card** | Read/filter by document entity |
| **Stock Movement** | Read/filter by document entity |
| **Supplier Order** | Entity-scoped operational documents |
| **Finance** | Shared posting engine; periods, vouchers, reports per entity |
| **System** | Shared import and maintenance; role-gated |

---

## 6. Ownership vs consumer model

Some domains are **owned** by one entity's business (who maintains or originates the data) while **consumed** by one or both (who uses it in operations).

| Domain | Owner | Consumer | Notes |
|--------|-------|----------|-------|
| **POS** | ASAS | ASAS | ASAD has no POS |
| **Customer / Catalog / Promotion / CRM** | ASAS | ASAS + ASAD | ASAS maintains customer-facing catalog; ASAD may consume for operations |
| **Product & Reference Stock** | Shared | ASAS + ASAD | Single product master; entity separation at document/posting layer |
| **Finance** | Shared engine | ASAS + ASAD | Same modules; all postings and reports scoped by entity |

**Owner** = who maintains master data or primary workflow.  
**Consumer** = who may read or operate under permission and entity context.

When adding features, state both owner and consumer explicitly to avoid exposing ASAS-owned UI to ASAD without a deliberate decision.

---

## 7. Current ASAD menu model

Main menu is built in `lib/main-ui/main-menu.ts` from role and `documentEntityCode`.

When the user works under **ASAD (`AD`)** at HO:

### Administration

| Item | ASAD |
|------|------|
| Product & Reference Stock | Yes |
| Branch | Per role (HO_ADMIN) |
| Staff | Yes — HO roles only; **`SH_STAFF` is shop-only and not an HO administration concern** |
| Pricing | Per role |
| Receipt Setup | ASAS-oriented (shop receipts); ASAD typically does not use POS receipt layout |

### Operations

| Item | ASAD |
|------|------|
| Stock Documents | Yes |
| Stock Card | Yes (planned / same section) |
| Stock Movement | Yes (planned / same section) |
| Supplier Order | Yes (planned / same section) |
| Check Receipt | HO review of shop receipts — ASAS shop context |
| Catalog Image | Shared operational tool |

### Finance

Same menu tree and engine as ASAS. All reports, journals, periods, reconciliation, and close workflows filter or lock by `legalEntityCode = AD`.

### System

Same engine as ASAS: Import Master Database, Import Accounting Data (planned), Settings, Maintenance — subject to role (`HO_ADMIN` / system permissions).

### Shop section

**Not available for ASAD.** Entire section is ASAS-only (POS, targets, sales dashboards, worktime, closing).

---

## 8. Session and permission interaction

| Session field | Purpose |
|---------------|---------|
| `branchId` / `branchCode` | Operational location |
| `role` | HO vs shop capabilities |
| `documentEntityCode` | Default entity for **new** HO documents (`AS` default; `AD` when toggled at `HO999`) |

Permission layers:

1. **Role** — `canAccessRoute`, `canAccessMenu`, `canAccessMasterDatabase` (`lib/permissions/`)
2. **Entity** — e.g. `canAccessShopSalesDashboard(documentEntityCode)` for ASAS-only shop reports
3. **Document** — persisted `legalEntityCode` on posted artifacts for audit and reporting

Shop staff (`SH_STAFF`) always operate as ASAS at the shop branch; they do not receive HO main menu or entity toggle.

---

## 9. Future rule: classify before ASAD exposure

Before exposing any new module to ASAD, record its classification:

| Class | Action |
|-------|--------|
| **Shared** | Implement entity scoping on documents, queries, and reports; add AD smoke tests |
| **Entity-specific** | Document per-entity defaults (numbering scope, print identity, period rules) |
| **ASAS-only** | Hide from AD menu; block API with entity guard; do not query AS sales/stock from AD session |
| **ASAS-owned but ASAD-consumed** | Read-only or controlled write paths for AD; owner remains AS for master updates |

Update this document (or a short addendum table) when classification is decided.

---

## 10. References

| Item | Location |
|------|----------|
| Legal entity codes and display names | `lib/legal-entity/constants.ts` |
| Login / toggle / validation | `lib/legal-entity/document-entity.ts` |
| Main menu by section and entity | `lib/main-ui/main-menu.ts` |
| Shop sales entity gate | `lib/permissions/sales-dashboard.ts` |
| MC-1A minimal legal entity design | [migration/MC1A_MINIMAL_LEGAL_ENTITY_DESIGN.md](../migration/MC1A_MINIMAL_LEGAL_ENTITY_DESIGN.md) |
| MC-1D implementation plan | [migration/MC1D_LEGAL_ENTITY_IMPLEMENTATION_PLAN.md](../migration/MC1D_LEGAL_ENTITY_IMPLEMENTATION_PLAN.md) |
| Combined migration (separate entities) | [migration/combined/ASAD_ASAS_COMBINED_MIGRATION_RECOMMENDATION.md](../migration/combined/ASAD_ASAS_COMBINED_MIGRATION_RECOMMENDATION.md) |
| Architecture overview | [00_ARCHITECTURE_OVERVIEW.md](./00_ARCHITECTURE_OVERVIEW.md) |
