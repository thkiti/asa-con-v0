# MC-1D — LegalEntity Implementation Plan

Project: `asa-con-v0`  
Status: Implementation plan only (no schema, code, migration, or tests in this phase)  
Prerequisites: [MC1A_MINIMAL_LEGAL_ENTITY_DESIGN.md](./MC1A_MINIMAL_LEGAL_ENTITY_DESIGN.md), MC-1B gap analysis, MC-1C locked decisions  

---

## Locked decisions (MC-1C — do not revisit in MC-1D)

| Topic | Decision |
|---|---|
| Field name | `legalEntityCode` (FK → `LegalEntity.code`), not `Branch.legalEntityId` |
| `JournalEntry` | Store `legalEntityCode` directly; must match `Voucher` on post |
| `AccountingPeriod` | Entity-owned; unique `(legalEntityCode, periodKey)`; `branchId` is operational metadata only |
| Line / ledger children | Derive entity from parent header |
| POS / SHOP | Force `AS` via validation; no entity column on Sale/Receipt |
| M2 gate | Full MC-1D complete before opening journal or opening stock import |

---

## 1. Exact schema changes required

All changes target [`prisma/schema.prisma`](../../prisma/schema.prisma). Exact Prisma syntax follows existing conventions (`String`, `@relation`, `@@index`, `@@unique`).

### 1.1 New model: `LegalEntity`

```prisma
model LegalEntity {
  code    String @id
  name    String
  address String?
  taxId   String?

  vouchers          Voucher[]
  journalEntries    JournalEntry[]
  accountingPeriods AccountingPeriod[]
  stockDocuments    StockDocument[]
}
```

Seed rows (application or migration SQL):

| code | name |
|---|---|
| `AS` | ASAS |
| `AD` | ASAD |

### 1.2 `Voucher.legalEntityCode`

Add after `branchId` (or adjacent to period fields):

```prisma
legalEntityCode String
legalEntity     LegalEntity @relation(fields: [legalEntityCode], references: [code])
```

- Required after backfill (see §2).
- Immutable after `status = POSTED` (enforced in domain, not DB trigger).

**Indexes:**

```prisma
@@index([legalEntityCode, date])
@@index([legalEntityCode, branchId, date])
```

Existing indexes retained: `@@unique([refType, refId])`, `@@index([branchId, date])`.

### 1.3 `JournalEntry.legalEntityCode`

```prisma
legalEntityCode String
legalEntity     LegalEntity @relation(fields: [legalEntityCode], references: [code])
```

- Required after backfill.
- Must equal parent `Voucher.legalEntityCode` at post time.

**Indexes:**

```prisma
@@index([legalEntityCode, periodId, date])
@@index([legalEntityCode, date])
```

Existing: `@@index([branchId, periodId, date])`, `@@index([date])`.

### 1.4 `AccountingPeriod.legalEntityCode`

```prisma
legalEntityCode String
legalEntity     LegalEntity @relation(fields: [legalEntityCode], references: [code])
```

**Unique constraint change (MC-1C locked):**

| Before | After |
|---|---|
| `@@unique([branchId, periodKey])` | `@@unique([legalEntityCode, periodKey])` |

- Drop compound unique on `(branchId, periodKey)`.
- Keep `branchId` column and optional `@@index([branchId])` for operational filtering.
- Entity owns close/reopen state; one row per entity per calendar month.

### 1.5 `StockDocument.legalEntityCode`

```prisma
legalEntityCode String
legalEntity     LegalEntity @relation(fields: [legalEntityCode], references: [code])
```

- Required after backfill.
- Immutable after confirm/post transitions.

**Indexes:**

```prisma
@@index([legalEntityCode, date])
@@index([legalEntityCode, docType, status])
```

Existing: `@@unique([refNo])`.

### 1.6 Models explicitly unchanged

No `legalEntityCode` on: `VoucherLine`, `JournalEntryLine`, `StockDocumentLine`, `StockTransaction`, `Branch`, `Staff`, `Product`, `GlAccount`, `Sale`, `Receipt`, close/reopen evidence tables.

### 1.7 Migration phases (schema rollout inside one or two migrations)

Recommended two-step SQL safety:

1. **Phase A** — Add `LegalEntity` table, seed `AS`/`AD`, add nullable `legalEntityCode` on four headers, add FKs and non-unique indexes.
2. **Phase B** — Backfill + dedupe (§2), then `ALTER COLUMN SET NOT NULL`, swap `AccountingPeriod` unique constraint.

---

## 2. Data migration / backfill strategy

### 2.1 Principles

- All existing production-like rows default to **`AS`** (ASAS / retail side owns current live data).
- **`AD`** rows are created as master seed only until M2a opening import.
- Backfill runs **before** NOT NULL enforcement.
- Session is never backfilled — application-only.

### 2.2 Seed `LegalEntity`

Idempotent upsert:

```sql
INSERT INTO "LegalEntity" ("code", "name", "address", "taxId")
VALUES ('AS', 'ASAS', NULL, NULL), ('AD', 'ASAD', NULL, NULL)
ON CONFLICT ("code") DO NOTHING;
```

Optional: populate `address` / `taxId` from business records before tax reports (not blocking M2).

### 2.3 Backfill document headers → `AS`

Order (respect FK dependencies):

1. `AccountingPeriod` — see §2.4 first (structural dedupe).
2. `Voucher` — `UPDATE … SET "legalEntityCode" = 'AS' WHERE "legalEntityCode" IS NULL`.
3. `JournalEntry` — same; verify `JournalEntry.legalEntityCode = Voucher.legalEntityCode` via join.
4. `StockDocument` — same.

Post-backfill assertion queries (run in migration script or smoke):

- Zero null `legalEntityCode` on the four tables.
- Zero `JournalEntry` rows where entity ≠ linked voucher entity.
- Zero `Voucher`/`JournalEntry` rows where entity ≠ linked `AccountingPeriod.legalEntityCode`.

### 2.4 Existing `AccountingPeriod` rows — dedupe strategy

**Problem:** Current schema has one period per `(branchId, periodKey)`. MC-1C requires one period per `(legalEntityCode, periodKey)`. Multiple shop branches may each have `2026-01` rows.

**Strategy:**

1. Add nullable `legalEntityCode`; set all existing rows to `'AS'`.
2. For each `periodKey`, pick **one canonical** `AccountingPeriod` id:
   - Prefer row where `branch.code = 'HO999'` if present.
   - Else prefer earliest `openedAt`.
   - Else lowest `id` (stable tie-break).
3. **Re-point** all `Voucher.periodId` and `JournalEntry.periodId` from duplicate period ids → canonical id for that `periodKey`.
4. **Delete** duplicate `AccountingPeriod` rows for same `(legalEntityCode, periodKey)` after re-point (cascade check close/reopen evidence — evidence rows keep `periodId`; ensure no orphans).
5. Apply `@@unique([legalEntityCode, periodKey])`.
6. **Bootstrap AD periods:** For each distinct `periodKey` that exists for `AS`, create matching `AccountingPeriod` with `legalEntityCode = 'AD'`, `status = OPEN`, `branchId = HO999` (operational metadata). If no HO branch, use first HO-type branch.

**Status merge rule (if duplicates disagree):** Use most restrictive status rank: `HARD_CLOSED` > `SOFT_CLOSED` > `OPEN`. Document in run log which branch row was canonical.

**Rollback note:** Keep pre-dedupe DB dump before Phase B (§7).

### 2.5 Future rows

| Path | Default entity |
|---|---|
| SHOP / POS / non-HO branch | `AS` (forced) |
| HO999 HO finance/admin | Session `documentEntityCode` (`AS` default; user may select `AD`) |
| M2 opening journal import | Explicit batch entity (`AD` or `AS`) |
| M2 opening stock import | Explicit batch entity on `StockDocument` |

---

## 3. Application changes by area

Business logic stays in `lib/<domain>/`; routes remain thin. Key touchpoints today:

| Area | Current files |
|---|---|
| Session | [`lib/auth/types.ts`](../../lib/auth/types.ts), [`lib/auth/session-cookies.ts`](../../lib/auth/session-cookies.ts), [`lib/auth/credential-login.ts`](../../lib/auth/credential-login.ts), [`lib/auth/session.ts`](../../lib/auth/session.ts) |
| Period resolution | [`lib/finance/posting-period.ts`](../../lib/finance/posting-period.ts), [`lib/finance/period-setup.ts`](../../lib/finance/period-setup.ts), [`app/api/finance/periods/route.ts`](../../app/api/finance/periods/route.ts) |
| Finance post | [`lib/finance/voucher.ts`](../../lib/finance/voucher.ts), [`lib/finance/journal.ts`](../../lib/finance/journal.ts), [`lib/finance/posting.ts`](../../lib/finance/posting.ts), [`lib/finance/closing-entry-post.ts`](../../lib/finance/closing-entry-post.ts) |
| Stock | [`lib/stock/document/document-save.ts`](../../lib/stock/document/document-save.ts), [`lib/stock/posting.ts`](../../lib/stock/posting.ts) |
| Reports | [`lib/finance/reports/report-filter.ts`](../../lib/finance/reports/report-filter.ts), trial balance / P&L / balance sheet / GL / retained earnings under `lib/finance/reports/` |
| Import | [`lib/import/apply-gate.ts`](../../lib/import/apply-gate.ts), [`app/api/system/import/*`](../../app/api/system/import/) |

### 3.1 New shared domain module (recommended)

Add `lib/legal-entity/` (or `lib/finance/legal-entity.ts` if keeping finance-adjacent):

- `LEGAL_ENTITY_CODES = ['AS', 'AD'] as const`
- `LegalEntityCode` type
- `resolveDocumentEntityCode(session, explicitOverride?)` — session default with path overrides
- `assertEntityAllowedForSession(session, code)` — SHOP/POS/role rules
- `assertEntityImmutable(existingCode, newCode, context)` — post/confirm guard

### 3.2 Login / session — `documentEntityCode`

**Extend `SessionUser`** ([`lib/auth/types.ts`](../../lib/auth/types.ts)):

```ts
documentEntityCode: 'AS' | 'AD'
```

**Cookie** — add `documentEntityCode` to [`lib/auth/cookies.ts`](../../lib/auth/cookies.ts), `setSessionCookies`, `readSessionCookies`, `clearSessionCookies`.

**Login default** ([`lib/auth/credential-login.ts`](../../lib/auth/credential-login.ts)):

| Condition | `documentEntityCode` |
|---|---|
| `branchCode` starts with `SH` (shop) | `AS` |
| Branch ≠ `HO999` | `AS` |
| `HO999` + `HO_FINANCE` or `HO_ADMIN` | `AS` (default; toggle may change) |
| Other roles at HO999 | `AS` (no toggle) |

**New API:** `PATCH /api/auth/document-entity` (or extend existing session/me route)

- Body: `{ documentEntityCode: 'AS' | 'AD' }`
- Allowed only when: `branchCode === 'HO999'` AND role ∈ `{ HO_FINANCE, HO_ADMIN }`
- Reject `AD` for SHOP roles/branches
- Updates cookie + returns updated session payload

**Login UI:** Entity toggle on HO999 login for eligible roles; hidden elsewhere.

### 3.3 HO999 toggle

- Finance/stock create pages at HO read `documentEntityCode` from session.
- Toggle is **working context only** — persisted documents store their own `legalEntityCode`.
- Changing toggle does not alter existing vouchers/journals/stock documents.

### 3.4 SHOP / POS force `AS`

Enforce in domain (not only UI):

- [`lib/pos/checkout.ts`](../../lib/pos/checkout.ts) → `postSaleVoucher` path uses `AS`
- [`lib/pos/pos-shop-session.ts`](../../lib/pos/pos-shop-session.ts) — any finance side-effect from POS
- [`lib/stock/document/document-save.ts`](../../lib/stock/document/document-save.ts) when `branchCode` is shop (`SH*`)
- Reject client-supplied `AD` on shop routes with `403` / domain error

### 3.5 Finance document create / post

**Period lookup** — refactor [`assertPostingPeriodOpen`](../../lib/finance/posting-period.ts):

| Before | After |
|---|---|
| `findUnique({ branchId_periodKey })` | `findUnique({ legalEntityCode_periodKey })` |

Signature gains `legalEntityCode`; callers pass resolved entity, not inferred from branch alone.

**`bootstrapPeriodIfMissing`** ([`lib/finance/period-setup.ts`](../../lib/finance/period-setup.ts)):

- Input: `{ legalEntityCode, periodKey, branchId? }`
- Create/find by `(legalEntityCode, periodKey)`
- When bootstrapping `AD`, also ensure `AS` row exists for same `periodKey` if missing (optional symmetry for HO UI)

**Voucher create** ([`lib/finance/voucher.ts`](../../lib/finance/voucher.ts)):

- Persist `legalEntityCode` on create
- Validate `period.legalEntityCode === voucher.legalEntityCode`

**Journal create** ([`lib/finance/journal.ts`](../../lib/finance/journal.ts)):

- Copy `legalEntityCode` from voucher input (or read voucher in tx)
- Store on `journalEntry.create`

**Operational posting** ([`lib/finance/posting.ts`](../../lib/finance/posting.ts)):

- `postOperationalVoucher`, `postSaleVoucher`, `postStockDocumentVoucher`, manual journal — thread `legalEntityCode` through inputs
- POS sale: hardcode `AS`
- Stock document voucher: read from `doc.legalEntityCode`

**Period close/reopen** ([`lib/finance/period-close.ts`](../../lib/finance/period-close.ts), [`app/api/finance/periods/route.ts`](../../app/api/finance/periods/route.ts)):

- API accepts `legalEntityCode` (required for HO; default `AS` for shop-only flows)
- Close/reopen targets entity-scoped period row
- List/filter periods by `legalEntityCode` + optional `branchId`

**Manual journal UI/API** ([`app/api/finance/journal-entries/route.ts`](../../app/api/finance/journal-entries/route.ts), [`components/finance/ManualJournalEntryPage.tsx`](../../components/finance/ManualJournalEntryPage.tsx)):

- Use session `documentEntityCode` at HO999; show active entity in header

### 3.6 Stock document create / post

**Create/save** ([`lib/stock/document/document-save.ts`](../../lib/stock/document/document-save.ts)):

- Set `legalEntityCode` on create from resolved session entity
- SHOP paths: force `AS`
- Allow optional explicit override on HO admin paths only (validated)

**Post** ([`lib/stock/posting.ts`](../../lib/stock/posting.ts)):

- Assert document has `legalEntityCode` before post
- Finance voucher builder reads entity from document header

**Stock UI session** ([`lib/stock-ui/session.ts`](../../lib/stock-ui/session.ts), shop stock routes):

- Expose active `documentEntityCode` to HO stock editors for display

### 3.7 Report filters

**Extend** [`lib/finance/reports/report-filter.ts`](../../lib/finance/reports/report-filter.ts):

```ts
type LegalEntityReportScope = 'AS' | 'AD'  // CONSOLIDATED deferred
```

- Add required query param `legalEntityCode` (or `entityScope`) on finance report APIs
- Default UI to `AS` where ambiguous; HO finance may switch to `AD`
- **`branchId` remains** for operational branch filtering where reports already use it; **entity filter is primary GL boundary**

**Query changes** (all under `lib/finance/reports/`):

- `buildJournalEntryWhere`: add `legalEntityCode: filter.legalEntityCode`
- `resolvePeriodId`: lookup by `(legalEntityCode, periodKey)` not `(branchId, periodKey)`
- Retained earnings, close evidence exports: filter by entity

**Deferred:** `CONSOLIDATED` scope (include both entities, sum by account — no eliminations).

---

## 4. Validation rules

Centralize in `lib/legal-entity/validation.ts` (or split finance/stock helpers calling shared core).

### 4.1 Global

| Rule | Error behavior |
|---|---|
| `legalEntityCode ∈ { AS, AD }` | Reject create/update |
| Code exists in `LegalEntity` | Reject |
| User authorized for requested entity | HO finance/admin may use both at HO999; others AS only |
| Entity immutable after post/confirm | Reject update unless audited correction workflow (none in MC-1D) |

### 4.2 Voucher / JournalEntry / AccountingPeriod consistency

| Checkpoint | Rule |
|---|---|
| Voucher create | `voucher.legalEntityCode === period.legalEntityCode` |
| Journal post | `journal.legalEntityCode === voucher.legalEntityCode === period.legalEntityCode` |
| Period close | Close only rows matching requested `legalEntityCode`; block if journals of other entity reference same period id (should be impossible after dedupe) |
| Manual journal | Same as operational voucher |

### 4.3 StockDocument

| Rule | |
|---|---|
| `legalEntityCode` required on create | NOT NULL after backfill |
| SHOP-created documents | Must be `AS` |
| Post | Entity must match document header; no mid-flow change |
| Single document | No mixed AD/AS lines (lines inherit header — no line-level field) |

### 4.4 POS

| Rule | |
|---|---|
| POS checkout finance posting | Always `AS` |
| SHOP stock counts | Always `AS` |

### 4.5 M2 import gates

Extend [`lib/import/apply-gate.ts`](../../lib/import/apply-gate.ts) and future M2 import services:

| Gate | Rule |
|---|---|
| Batch manifest | Required `legalEntityCode: 'AS' \| 'AD'` |
| Row-level | Must match batch entity if present |
| Mixed entity file | Reject unless explicitly designed (not in MC-1D) |
| Missing entity | Reject |
| Opening journal | Requires MC-1D schema + validations live |
| Opening stock | Requires `StockDocument.legalEntityCode` writable and validated |

Pre-M2 checklist gate in apply-gate: fail if `LegalEntity` seed missing or if any of four headers lack NOT NULL `legalEntityCode`.

---

## 5. Test plan

Write tests **after** implementation commits (listed here for MC-1D scope; do not write in plan-only phase).

### 5.1 Schema / domain

| Test file (suggested) | Cases |
|---|---|
| `__tests__/lib/legal-entity/resolve-document-entity.test.ts` | HO999 toggle roles; SH force AS; invalid codes |
| `__tests__/lib/legal-entity/validation.test.ts` | Immutability; period/voucher/journal consistency |
| `__tests__/lib/finance/posting-period.test.ts` (extend) | Lookup by `(legalEntityCode, periodKey)` |
| `__tests__/lib/finance/period-setup.test.ts` | Bootstrap AS vs AD rows; unique constraint |

### 5.2 Finance posting

| Extend / add | Cases |
|---|---|
| `__tests__/lib/finance/posting.test.ts` | Voucher + journal store matching entity; POS sale forces AS |
| `__tests__/lib/finance/closing-entry-posting.test.ts` | Close respects entity-scoped period |
| `__tests__/lib/finance/period-close.test.ts` | AD period close does not affect AS period same month |

### 5.3 Stock document

| Extend | Cases |
|---|---|
| `__tests__/lib/stock/document-save.test.ts` | Create persists entity; SH forces AS |
| `__tests__/app/api/stock-document/post-route.test.ts` | Post rejects missing entity; HO AD path |

### 5.4 Session / login

| Extend / add | Cases |
|---|---|
| `__tests__/lib/auth/credential-login.test.ts` | Default `documentEntityCode` by branch/role |
| `__tests__/app/api/auth/document-entity-route.test.ts` | Toggle allowed/blocked; cookie update |

### 5.5 Report filters

| Extend | Cases |
|---|---|
| `__tests__/lib/finance/reports/trial-balance.test.ts` | AS-only vs AD-only isolation |
| `__tests__/lib/finance/reports/report-filter.test.ts` | Parse `legalEntityCode`; reject missing |
| `__tests__/lib/finance/reports/balance-sheet.test.ts` | No cross-entity leakage |

### 5.6 Import gates

| Extend | Cases |
|---|---|
| `__tests__/lib/import/apply-gate.test.ts` | Reject apply when LegalEntity layer incomplete; reject mixed-entity manifest |

---

## 6. Rollout sequence

Safest order: **schema → backfill → domain → session → writers → readers → gates → tests**.

### Step 0 — Pre-flight

- DB backup / snapshot
- Confirm MC-1C decisions unchanged
- Branch `feature/mc-1d-legal-entity` (suggested)

**Checkpoint:** Clean `npm test` on main baseline.

### Step 1 — Schema Phase A (migration)

- Add `LegalEntity` model + seed in migration SQL
- Add nullable `legalEntityCode` + FKs on four headers
- Add non-unique indexes (§1)
- Do **not** drop old `AccountingPeriod` unique yet

**Commands (when executing):**

```bash
# After editing prisma/schema.prisma
npx prisma migrate dev --name legal_entity_phase_a
npm run db:generate
```

**Checkpoint:** Migrate applies; app still runs (nullable columns); tests may need temporary skips only if they hard-fail on schema drift.

### Step 2 — Backfill script

- Add `scripts/backfill/legal-entity-phase-b.ts` (or migration SQL)
- Run dedupe + AS backfill (§2.3–2.4)
- Bootstrap AD periods for existing `periodKey` set
- Run assertion queries

**Commands:**

```bash
npx tsx scripts/backfill/legal-entity-phase-b.ts
# or second migration with SQL backfill
```

**Checkpoint:** Zero null entities; single period row per `(legalEntityCode, periodKey)`; journal/voucher/period entity alignment queries pass.

### Step 3 — Schema Phase B (migration)

- `SET NOT NULL` on four `legalEntityCode` columns
- Drop `AccountingPeriod_branchId_periodKey_key`
- Add `AccountingPeriod_legalEntityCode_periodKey_key`

**Commands:**

```bash
npx prisma migrate dev --name legal_entity_phase_b
npm run db:generate
```

**Checkpoint:** Prisma client reflects new unique; `bootstrapPeriodIfMissing` still works against new constraint in integration smoke.

### Step 4 — Domain constants + validation

- `lib/legal-entity/*`
- No route changes yet

**Checkpoint:** Unit tests for resolve/validate pass.

### Step 5 — Session + cookie + toggle API + login UI

- `SessionUser`, cookies, credential login defaults
- `PATCH /api/auth/document-entity`
- HO999 toggle component

**Checkpoint:** Manual: login HO999 as HO_FINANCE, toggle AD/AS, cookie persists; SH login has no toggle, entity AS.

### Step 6 — Period resolution refactor

- `posting-period.ts`, `period-setup.ts`, period list/close/reopen APIs
- Accept `legalEntityCode` on period admin routes

**Checkpoint:** `scripts/smoke-finance-period.ts` updated; soft/hard close on AS does not lock AD.

### Step 7 — Finance writers

- `voucher.ts`, `journal.ts`, `posting.ts`, closing entry post, manual journal API
- POS hardcode AS

**Checkpoint:** Post sale + manual journal create rows with correct entity; journal matches voucher.

### Step 8 — Stock writers

- `document-save.ts`, posting path, HO stock UI entity display

**Checkpoint:** Shop save forces AS; HO save respects session entity.

### Step 9 — Report readers

- `report-filter.ts` + all finance report queries
- Finance UI entity selector (HO)

**Checkpoint:** Trial balance AS excludes AD journals and vice versa.

### Step 10 — Import gates

- `apply-gate.ts` MC-1D readiness check
- Manifest validation stub for future M2 entity field

**Checkpoint:** Apply gate fails pre-backfill (in test env); passes after full rollout.

### Step 11 — Tests (full suite)

**Commands:**

```bash
npm test
npm run audit:finance
npm run audit:posting-lock
```

**Checkpoint:** All tests green; finance boundary audit clean.

### Step 12 — M2 readiness sign-off

- Document smoke checklist in `docs/migration/` (optional MC-1E)
- Explicit go/no-go before M2a (AD) / M2b (AS) opening imports

---

## 7. Risks and rollback notes

| Risk | Impact | Mitigation |
|---|---|---|
| **AccountingPeriod dedupe** re-points wrong `periodId` | Broken close evidence / journal links | Backup before Step 2; assertion queries; keep mapping log of old→canonical ids |
| **Branch-based period code left in callers** | Silent wrong period or post to wrong entity | Grep for `branchId_periodKey`; refactor in Step 6 before writers |
| **Reports mix entities** | Wrong TB/P&L before M2 | Entity filter mandatory on report APIs; tests for isolation |
| **Session mistaken for audit truth** | User toggles entity, misreads old docs | UI labels; reports filter persisted document entity |
| **HO creates AD stock/POS paths** | Policy violation | Central `assertEntityAllowedForSession`; SHOP hard reject |
| **Nullable phase too long** | New rows with null entity | Short window; block deploy between Phase A and B in production |
| **Over-scoping Branch entity FK** | Reintroduces HO999 ambiguity | MC-1C locked: no `Branch.legalEntityId` |

### Rollback

| Step failed | Rollback action |
|---|---|
| Phase A migration only | Restore DB backup; revert migration |
| After backfill Phase B | Restore DB backup (forward rollback unsafe once re-pointed) |
| Application Steps 4–10 | Revert commits; schema may remain if backfill succeeded — app must tolerate entity columns |
| Production | **Do not** run Phase B without verified backup; prefer maintenance window |

### Forward-fix preferred over rollback after Step 3

Once NOT NULL + unique constraint applied, rollback requires DB restore, not code-only revert.

---

## M2 gate summary

M2 opening journal and opening stock import may start **only after** Steps 1–11 complete:

- [ ] `LegalEntity` seeded (`AS`, `AD`)
- [ ] Four headers have NOT NULL `legalEntityCode`
- [ ] `AccountingPeriod` unique `(legalEntityCode, periodKey)`
- [ ] Session `documentEntityCode` + HO999 toggle
- [ ] POS/SHOP forced `AS`
- [ ] Finance post + stock create persist entity
- [ ] Reports filter by entity
- [ ] Import apply gate enforces entity manifest rules
- [ ] Test suite green

---

## References

- [MC1A_MINIMAL_LEGAL_ENTITY_DESIGN.md](./MC1A_MINIMAL_LEGAL_ENTITY_DESIGN.md)
- MC-1B gap analysis / MC-1C decisions: `.cursor/plans/mc-1b_gap_analysis_48bb8791.plan.md`
- Current schema: [`prisma/schema.prisma`](../../prisma/schema.prisma)
