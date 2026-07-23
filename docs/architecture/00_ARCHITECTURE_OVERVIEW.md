# Architecture Overview — ASAS / ASAD

Project: `asa-con-v0`  
Status: Active  
Scope: Core architecture decisions for legal-entity separation inside one application

---

## Purpose of this document set

These documents live under `docs/architecture/` — **not** under Manual, Finance, Stock, or Operations runbooks.

They explain **why** `asa-con-v0` uses:

- One application and one database
- Explicit legal-entity separation (`AS` / `AD`)
- Permission and menu control per entity

…instead of maintaining duplicate ASAS and ASAD systems, databases, or deployments.

| Document | Contents |
|----------|----------|
| [00_ARCHITECTURE_OVERVIEW.md](./00_ARCHITECTURE_OVERVIEW.md) | This file — principles and summary |
| [01_ASAS_ASAD_ENTITY_MODEL.md](./01_ASAS_ASAD_ENTITY_MODEL.md) | Entity model, module classification, ownership, menu, identity leakage |
| [02_PERIOD_STOCK_LEDGER_DECISION.md](./02_PERIOD_STOCK_LEDGER_DECISION.md) | Period-based stock ledger — per-event StockTransaction retired |

Implementation detail for schema and migration gates: [migration/MC1A_MINIMAL_LEGAL_ENTITY_DESIGN.md](../migration/MC1A_MINIMAL_LEGAL_ENTITY_DESIGN.md), [migration/MC1D_LEGAL_ENTITY_IMPLEMENTATION_PLAN.md](../migration/MC1D_LEGAL_ENTITY_IMPLEMENTATION_PLAN.md).

---

## Core decision

**ASAS and ASAD are business entities, not separate applications.**

| Code | Legal entity | Primary business role |
|------|--------------|------------------------|
| `AS` | ASAS | Retail, services, POS, shops, customer-facing operations |
| `AD` | ASAD | Import, supplier purchases, material ownership, distribution (main customer: ASAS) |

Legacy history may show two ERP folders or two company books. In `asa-con-v0` they are **two legal entities inside one modular monolith** — same codebase, same database, same deployment.

---

## One application / one database

| Layer | Rule |
|-------|------|
| Repository | One git repo (`asa-con-v0`) |
| Application | One Next.js App Router project |
| Database | One Prisma schema, one PostgreSQL database |
| Deployment | One deployable app |

**Shared across entities:**

- Office / branch master
- Staff master
- Product master
- Supplier and customer references
- HO control workflows
- Operational users (with role + entity permissions)

**Separated by entity:**

- Accounting documents (vouchers, journal entries)
- Tax identity and VAT reporting
- Financial statements and retained earnings
- Legal-entity-scoped stock document ownership where accounting impact applies
- Document numbering scope (sequences are entity-aware via data model, not string prefix)

The project explicitly **does not** use duplicate databases, duplicate deployments, duplicate product masters, or duplicate staff masters.

---

## Shared implementation, entity-aware behavior

Where ASAS and ASAD workflows are the same, they share one implementation:

- Stock document save / post pipeline
- Finance posting engine
- Master database CRUD
- System import and maintenance

Differences are handled through **configuration and guards**, not forked codebases:

| Mechanism | What it controls |
|-----------|------------------|
| **Entity code** (`legalEntityCode` / session `documentEntityCode`) | Document ownership, report filters, period close scope |
| **Document numbering** | Entity-neutral number format (`MJV-260001`); entity is a separate header field — see [99_ASA_HANDBOOK.md](../99_ASA_HANDBOOK.md) |
| **Company identity** | `LegalEntity` master (`name`, `address`, `taxId`) |
| **Letterhead / receipt identity** | Receipt setup, branch tax IDs, print settings |
| **Permissions** | Role matrix + entity gates (menu, route, API) |

Branch / location is **not** the same as document owner. A HO user at `HO999` may create documents for either `AS` or `AD`; entity is stored on the document, not inferred from branch alone.

---

## Identity leakage risk

The main architectural risk in a single-database multi-entity system is **identity leakage**: data, UI, or reports from one legal entity appearing under the wrong company context.

Typical failure modes:

- Reports query without `legalEntityCode` filter → AS and AD balances mix silently
- Menu or API exposes ASAS-only features when session is `AD`
- Session `documentEntityCode` used for historical reads instead of persisted document entity
- Branch assumed to imply legal owner (unsafe at `HO999`)
- Shared product master mistaken for shared inventory ownership

Mitigation is **defense in depth**: persist entity on every legal-entity-sensitive document; filter reports and periods by entity; gate menus and APIs by role **and** entity; treat session entity as create-time default only.

See [01_ASAS_ASAD_ENTITY_MODEL.md](./01_ASAS_ASAD_ENTITY_MODEL.md) for module-level rules and the ownership vs consumer model.

---

## Module exposure (summary)

### ASAS-only

No ASAD menu, route, or data path:

- Full POS
- Shop Sales
- Target Sales
- Last Month / Actual Sales
- Work Time
- Receipt
- Refund
- READ_Z
- Payment Evidence

### Shared / entity-based

Same engine; behavior scoped by `legalEntityCode` and permissions:

- Product & Reference Stock
- Stock Documents
- Stock Card
- Stock Movement
- Supplier Order
- Finance
- System

Full classification and ownership model: [01_ASAS_ASAD_ENTITY_MODEL.md](./01_ASAS_ASAD_ENTITY_MODEL.md).

---

## Current ASAD menu model (summary)

When session `documentEntityCode` is `AD`, HO users see:

| Section | ASAD access |
|---------|-------------|
| **Administration** | Product & Reference Stock; Staff (HO roles only — **not** `SH_STAFF`) |
| **Operations** | Stock Documents, Stock Card, Stock Movement, Supplier Order |
| **Finance** | Same engine as ASAS — entity-scoped reports and periods |
| **System** | Same engine as ASAS — import, settings, maintenance (per role) |
| **Shop** | **Hidden** — POS and shop sales are ASAS-only |

---

## Future rule for new modules

Before exposing any module to ASAD, classify it as one of:

| Class | Meaning |
|-------|---------|
| **Shared** | Same workflow for both entities; scope by `legalEntityCode` |
| **Entity-specific** | Same code path; different defaults, numbering, or print identity per entity |
| **ASAS-only** | Must not appear in ASAD menu, routes, or queries |
| **ASAS-owned but ASAD-consumed** | Master or catalog owned/maintained by ASAS context; ASAD may read or use under permission |

Document the classification in this architecture set before shipping ASAD exposure.

---

## Related documents

| Topic | Document |
|-------|----------|
| Modular monolith boundaries | [01_MODULAR_MONOLITH_BOUNDARIES.md](../01_MODULAR_MONOLITH_BOUNDARIES.md) |
| Auth and RBAC | [05_AUTH_PERMISSIONS.md](../05_AUTH_PERMISSIONS.md) |
| Domain and routes | [03_DOMAIN_MAP.md](../03_DOMAIN_MAP.md) |
| Legal entity design (MC-1A) | [migration/MC1A_MINIMAL_LEGAL_ENTITY_DESIGN.md](../migration/MC1A_MINIMAL_LEGAL_ENTITY_DESIGN.md) |
| Document numbering | [99_ASA_HANDBOOK.md](../99_ASA_HANDBOOK.md) |
| Entity model detail | [01_ASAS_ASAD_ENTITY_MODEL.md](./01_ASAS_ASAD_ENTITY_MODEL.md) |
