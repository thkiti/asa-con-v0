# Document Archive / DocumentArchiveLink — Implementation Plan

Status: **Implementation plan — no schema or production code in this document**  
Prerequisite: [FINANCE_DOCUMENT_ARCHIVE_VAULT_DESIGN.md](./FINANCE_DOCUMENT_ARCHIVE_VAULT_DESIGN.md) (approved design)  
Related: [FINANCE_DOCUMENT_AUDIT_MATRIX.md](./FINANCE_DOCUMENT_AUDIT_MATRIX.md), [PHASE17_DOCUMENT_ARCHIVE_SNAPSHOT_ENGINE.md](./PHASE17_DOCUMENT_ARCHIVE_SNAPSHOT_ENGINE.md), `lib/document-archive/`

---

## Purpose

Roll out the central **Document Vault** in controlled phases:

- **`DocumentArchive`** — stored file metadata + storage location
- **`DocumentArchiveLink`** — polymorphic join from archive file → source document(s)
- **`documentKind`** — source document type (OPB, MJV, COL, REC, …)
- **`archiveKind`** — file purpose (DOCUMENT_PDF, BANK_PAY_IN_SLIP, …)
- **`pdfAvailable` / `archiveAvailable`** — tri-state inquiry columns (`true` / `false` / `null`)

**Approved business rules (must not regress):**

- COL is **not closed** at collector pickup; **closes only after successful POST PAY-IN**.
- `BANK_PAY_IN_SLIP` evidence is **required before POST PAY-IN** (button disabled until present; server safety net).
- One pay-in slip archive may link to **many COL tickets**.
- Bank pay-in slip belongs to **COL**, not PAY.

**Current code reality:** Prisma already has a partial `DocumentArchive` model (`RECEIPT` only, document fields on the archive row). Phase 1 **evolves** that shape — it does not add duplicate tables.

---

## Rollout sequence (summary)

```text
Phase 0  Design + plan approval
    ↓
Phase 1  Schema migration (tables/enums/indexes only)
    ↓
Phase 2  Read-only status resolver in inquiry hubs (no upload)
    ↓
Phase 3  Upload / download / status APIs
    ↓
Phase 4  MJV + Receipt legacy bridge (dual-read + lazy backfill)
    ↓
Phase 5  PAV / REV / PCV / Stock manual archive (browser PDF → upload)
    ↓
Phase 6  COL pay-in evidence + POST PAY-IN gating
```

Each phase ships independently testable; later phases depend on earlier ones.

---

## Phase 0 — Documentation approval checkpoint

**Goal:** Lock design and this plan before any migration.

| Deliverable | Owner | Done when |
|-------------|-------|-----------|
| [FINANCE_DOCUMENT_ARCHIVE_VAULT_DESIGN.md](./FINANCE_DOCUMENT_ARCHIVE_VAULT_DESIGN.md) approved | Product + HO Finance | Checklist §14 signed off |
| This implementation plan approved | Engineering | PR / sign-off recorded |
| Open questions resolved or explicitly deferred | Product | §13 in design doc updated |
| COL canonical `documentId` decision (minimum for Phase 6) | Product + Engineering | Documented in design doc |

**Exit criteria:** Explicit go/no-go for Phase 1 schema PR. No Prisma migration until Phase 0 complete.

**Non-deliverables:** No code, no migration files, no API routes.

---

## Phase 1 — Schema proposal only

**Goal:** Prisma migration introducing the **approved two-table model**. No application behaviour changes; existing features continue using legacy `pdfPath` paths.

### 1.1 `DocumentArchive` (file row)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `String @id @default(uuid())` | PK |
| `archiveKind` | enum `DocumentArchiveKind` | `DOCUMENT_PDF`, `BANK_PAY_IN_SLIP`, `RECEIPT_SLIP`, `REFUND_SLIP`, `READ_REPORT`, … |
| `archiveNo` | `String?` | Human/batch reference |
| `referenceNo` | `String?` | External bank ref |
| `legalEntityCode` | `String` or enum | `AS` / `AD` — align with `DocumentEntityCode` |
| `branchId` | `String?` | FK optional to `Branch` |
| `branchCode` | `String?` | Denormalized |
| `storagePath` | `String?` | Required when `status = ACTIVE` (app-enforced) |
| `storageUrl` | `String?` | Blob URL cache (replaces `pdfBlobUrl` naming on new rows) |
| `fileName` | `String?` | Download suggestion |
| `mimeType` | `String` | Default `application/pdf`; COL slip allows image types |
| `sizeBytes` | `Int?` | |
| `checksumSha256` | `String?` | |
| `archivedAt` | `DateTime?` | |
| `archivedByStaffId` | `String?` | |
| `status` | enum `DocumentArchiveStatus` | See §1.3 |
| `snapshotJson` | `Json?` | Future / MJV parity |
| `snapshotVersion` | `Int?` | |
| `errorMessage` | `String? @db.Text` | |
| `createdAt` / `updatedAt` | `DateTime` | |

**Remove from archive row (move to links):** `documentType`, `documentId`, `documentNo` on current pilot model.

**Legacy column mapping (migration strategy — Phase 1 doc only):**

| Current `DocumentArchive` | Target |
|---------------------------|--------|
| `documentType` / `documentId` / `documentNo` | → `DocumentArchiveLink` rows |
| `pdfPath` | → `storagePath` |
| `pdfBlobUrl` | → `storageUrl` |
| `generatedAt` | → `archivedAt` |
| `READY` status | → `ACTIVE` |

Keep `Receipt.documentArchiveId` and `Receipt.pdfPath` **unchanged** in Phase 1 (no column removal).

### 1.2 `DocumentArchiveLink` (join row)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `String @id @default(uuid())` | PK |
| `archiveId` | `String` | FK → `DocumentArchive.id` `onDelete: Restrict` |
| `documentKind` | enum `DocumentKind` | OPB, MJV, PAY, PAV, REV, PCV, CNT–ORI, REC, REF, COL, READ_X, READ_Z |
| `documentId` | `String` | Source PK (opaque string; no FK to all tables) |
| `documentNo` | `String` | Denormalized display number at link time |
| `linkType` | `String?` | `PRIMARY`, `EVIDENCE`, `COVERED_BY_PAYIN`, … |
| `isActive` | `Boolean @default(true)` | Soft-unlink without deleting archive |
| `createdAt` | `DateTime @default(now())` | |

Optional later: `supersededAt`, `supersededByLinkId`.

### 1.3 Enums

**`DocumentArchiveStatus`**

| Value | Use |
|-------|-----|
| `PENDING` | Attach in flight |
| `ACTIVE` | Readable bytes (new canonical; maps from legacy `READY`) |
| `FAILED` | Attach error |
| `SUPERSEDED` | Replaced by newer file |
| `VOID` | Withdrawn |

**`DocumentArchiveKind`** (`archiveKind`) — file purpose

`DOCUMENT_PDF`, `BANK_PAY_IN_SLIP`, `RECEIPT_SLIP`, `REFUND_SLIP`, `READ_REPORT` (+ reserved values)

**`DocumentKind`** (`documentKind`) — source document

`OPB`, `MJV`, `PAY`, `PAV`, `REV`, `PCV`, `CNT`, `ADJ`, `ORD`, `DEY`, `ORS`, `ORI`, `REC`, `REF`, `COL`, `READ_X`, `READ_Z`

**Enum vs string:** Prefer **Prisma enums** for `documentKind`, `archiveKind`, and `status` in Phase 1 for query safety. Add new values via migrations. `linkType` stays optional string for flexibility.

### 1.4 Uniqueness and indexes

| Constraint | Rule |
|------------|------|
| `DocumentArchiveLink` unique (1:1 kinds) | `@@unique([documentKind, documentId, archiveKind])` **where `isActive = true`** — use partial unique index in raw SQL if Prisma cannot express; else app-enforced until DB partial index |
| COL `BANK_PAY_IN_SLIP` | **Many links** may share same `archiveId`; uniqueness is per COL ticket, not per archive |
| `DocumentArchive` | Index `(legalEntityCode, archiveKind, archivedAt)` |
| `DocumentArchive` | Index `(branchId, archiveKind, createdAt)` |
| `DocumentArchiveLink` | Index `(documentKind, documentId)` |
| `DocumentArchiveLink` | Index `(archiveId)` |

No workflow triggers, no posting hooks, no inquiry resolver changes in Phase 1.

**Exit criteria:** Migration applies cleanly on dev DB; generated client compiles; **zero** runtime imports of new link table in business logic yet (types-only OK).

---

## Phase 2 — Read-only status integration

**Goal:** Central resolver drives inquiry **PDF / archive columns** without upload or storage writes.

### 2.1 Library modules (proposed)

| Module | Responsibility |
|--------|----------------|
| `lib/document-archive/kinds.ts` | Enum mirrors + `ARCHIVE_SUPPORTED_KINDS` |
| `lib/document-archive/resolve-pdf-available.ts` | `resolveDocumentVaultPdfAvailable(documentKind, documentId, archiveKind?)` |
| `lib/document-archive/resolve-col-archive-available.ts` | COL `archiveAvailable` per design §6.2 |
| `lib/document-archive/read-status.ts` | DB read: active link + readable archive |

**Resolver order (Phase 2):** vault link query only — **no legacy fallback yet** except where Phase 4 explicitly adds it. Until Phase 4, MJV/REC continue existing `pdfPath` mappers; new resolver returns `null` for unwired kinds (preserves today’s neutral dots).

### 2.2 Hub integration (read-only)

| Hub | Change |
|-----|--------|
| Finance Document Inquiry | Optional feature flag: use resolver for kinds wired in Phase 2 smoke test (can remain `null` for all until Phase 4) |
| Stock Document Inquiry | Same pattern for `DOCUMENT_PDF` when policy flag on |
| POS REC/REF Lookup | REC: prepare for `RECEIPT_SLIP`; REF: `null` until Phase 5+ |

### 2.3 Tests

- Unit tests for tri-state logic (`true` / `false` / `null`) with mocked Prisma
- COL `archiveAvailable` phase transitions (null → false → true)
- No upload API tests in this phase

**Exit criteria:** Inquiry APIs can return vault-derived status for **test fixtures**; production behaviour unchanged by default (feature flag off). No new red dots on unwired types.

---

## Phase 3 — Upload / archive API

**Goal:** HO Finance can create archives and links; download/status endpoints exist. Still **no** automatic POST-time generation.

### 3.1 API surface

| Method | Path | Behaviour |
|--------|------|-----------|
| `GET` | `/api/document-archive/status` | Query `documentKind`, `documentId`, `archiveKind?` |
| `GET` | `/api/document-archive/by-document/{kind}/{id}/file` | Stream bytes |
| `GET` | `/api/document-archive/{archiveId}/file` | Stream by archive id |
| `POST` | `/api/document-archive` | Multipart: file + metadata + `links[]` |
| `POST` | `/api/document-archive/{archiveId}/links` | Add COL links to existing pay-in archive |
| `POST` | `/api/document-archive/{archiveId}/retry` | Retry `FAILED` attach |

Permissions: `HO_FINANCE` / `HO_ADMIN` (align with voucher inquiry scope).

### 3.2 Write path

1. Validate mime type + size limits.
2. Store bytes via `lib/document-archive/storage/*` (existing local/blob backends).
3. Insert `DocumentArchive` (`PENDING` → `ACTIVE`).
4. Insert one or more `DocumentArchiveLink` rows in same transaction.
5. Compute `checksumSha256` when configured.

### 3.3 Tests

- Integration tests: upload → status `true` → download round-trip
- Multi-link COL upload (one file, two link rows)
- Reject unsupported mime types

**Exit criteria:** Manual upload works in dev; inquiry can show `pdfAvailable: true` for uploaded test documents. POST PAY-IN / posting still unchanged.

---

## Phase 4 — MJV / Receipt legacy bridge

**Goal:** Dual-read — **vault first**, fallback **`ManualJournalEntry.pdfPath`** / **`Receipt.pdfPath`**. Lazy backfill optional.

### 4.1 Resolver change

```text
resolveDocumentVaultPdfAvailable(...):
  result = vaultLinkResolver(...)
  if result is not null: return result
  return legacyPdfPathResolver(...)   // MJV/OPB/REC only
```

### 4.2 Backfill (lazy)

| Script | Behaviour |
|--------|-----------|
| `scripts/backfill-document-archive-from-mjv.ts` | For posted MJE with `pdfPath` and no link: create archive + link |
| `scripts/backfill-document-archive-from-receipt.ts` | Same for `Receipt` |

Run on-demand / scheduled — not blocking Phase 4 exit.

### 4.3 API aliases

- `GET /api/finance/manual-journal-entries/{id}/pdf` → vault download with legacy fallback
- `GET /api/pos/receipts/{receiptId}/pdf` → same

**Exit criteria:** Finance inquiry MJV/OPB/REC PDF dots match pre-vault behaviour; vault row exists for backfilled docs. **No** removal of legacy columns.

---

## Phase 5 — PAV / REV / PCV / Stock archive rollout

**Goal:** Posted operational documents support **manual archive** after browser print.

### 5.1 User workflow (per type)

1. User opens posted doc via inquiry (`?autoprint=1` already available).
2. Browser print / Save as PDF.
3. HO uploads PDF via Phase 3 API (`archiveKind=DOCUMENT_PDF`, single link).
4. Inquiry `pdfAvailable` → `true`.

### 5.2 Policy flags (per `documentKind`)

| Kind | Required when | Before policy on |
|------|---------------|------------------|
| PAV / REV / PCV | `status = POSTED` | `pdfAvailable: null` |
| Stock CNT–ORI | `POSTED` and/or `CONFIRMED` (product flag) | `null` |

Enable `false` (missing) only when product turns on requirement per kind.

### 5.3 UI (minimal)

- Finance inquiry: optional upload affordance on detail (HO only) — or standalone admin tool first
- Stock inquiry: same pattern

**Explicit non-goal this phase:** Server PDF generation on POST.

**Exit criteria:** End-to-end manual archive for at least one PAV and one Stock doc in UAT; inquiry dots reflect vault links.

---

## Phase 6 — COL pay-in evidence

**Goal:** `BANK_PAY_IN_SLIP` many-to-one links; **POST PAY-IN** gated on evidence.

### 6.1 Vault

- Upload one slip → one `DocumentArchive` (`archiveKind=BANK_PAY_IN_SLIP`) + N `DocumentArchiveLink` (`documentKind=COL`).
- MIME: `application/pdf`, `image/jpeg`, `image/png`.

### 6.2 Settlement UI (`/finance/pos-settlement/bank-deposit` or equivalent)

| Step | Behaviour |
|------|-----------|
| Evidence missing | **POST PAY-IN disabled** (not clickable) |
| Evidence linked | POST PAY-IN enabled |
| POST succeeds | Linked COL tickets → closed/posted per workflow |
| Server POST handler | Reject if required COL links lack active `BANK_PAY_IN_SLIP` (safety net) |

Bridge from existing `PosPayInEvidence` upload: either write vault rows on successful blob upload, or migrate blob path into `DocumentArchive.storagePath` + links.

### 6.3 Inquiry

- COL rows: `archiveAvailable` per design §6.2
- Align disabled POST PAY-IN with `archiveAvailable: false`

**Exit criteria:** UAT scenario — multiple COL tickets, one slip, POST PAY-IN, COL closed; inquiry shows correct archive state throughout.

---

## Explicit non-goals (all phases)

| Non-goal | Notes |
|----------|-------|
| Automatic server PDF generation on POST | MJV keeps existing attach; PAV/REV/PCV/Stock stay manual upload in first rollout |
| New `pdfPath` columns on operational tables | Vault + links only for new archives |
| Posting / accounting / period lock / numbering changes | Archive is sidecar metadata |
| Stock costing / ledger / stock transaction logic changes | |
| Shop operational editor changes (`/shop/stock-documents`, POS checkout) | Except POST PAY-IN gating in Phase 6 |
| Legacy column removal | `ManualJournalEntry.pdfPath`, `Receipt.pdfPath`, `Receipt.documentArchiveId` stay through Phase 6+ |
| Supersede / versioning UI | Schema may include `SUPERSEDED`; UI later |
| READ_X / READ_Z archive | Schema slots only until product approves |
| Inquiry filter **PAY** rename | Bank deposit vs vault PAY terminology — separate product task |

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **`documentId` canonical mismatch** | Broken links, wrong PDF on drill-down | Resolve in Phase 0 for REC and COL; document in `kinds.ts`; integration tests per kind; never infer id from display number alone |
| **Legacy `pdfPath` dual-read complexity** | Inconsistent dots if resolver order wrong | Single resolver module; feature flag; parity tests MJV/REC before cutover; log when fallback used |
| **COL many-to-one edge cases** | Partial deposits, one COL multiple slips, unlink wrong ticket | Phase 0 decision on multi-slip per COL; `linkType` + `isActive`; explicit unlink API; UAT matrix for N COL × 1 slip |
| **Existing pilot `DocumentArchive` shape** | Migration breaks receipt pilot | Phase 1 migration script: backfill links from old columns; keep `Receipt` FK optional during bridge |
| **MIME validation / security** | Malware upload, XSS via SVG | Allowlist mime types per `archiveKind`; max size; scan hook future; serve `Content-Disposition: attachment` |
| **Storage path consistency** | Broken download across envs | Reuse `lib/document-archive/storage/`; one env var; path traversal guards; never store absolute paths in DB |
| **POST PAY-IN UX vs server drift** | Button enabled but POST fails | Shared `canPostPayIn(evidenceLinks)` used by UI and API; integration tests |
| **`archiveAvailable null vs false`** | Wrong inquiry dots | Document COL phase detector; unit tests per workflow stage |
| **Enum migration churn** | Frequent Prisma migrations | Reserve enum values; use `READ_X` slots early; avoid stringly-typed kinds in DB |
| **Performance on inquiry list** | N+1 link queries | Batch resolver: `resolvePdfAvailableForRows(ids[])`; index `(documentKind, documentId)` |

---

## Suggested PR sequence (engineering)

| PR | Phase | Contents |
|----|-------|----------|
| 1 | 0 | Design + plan approval only (docs) |
| 2 | 1 | Prisma schema + migration + enum types in `lib/document-archive/types.ts` |
| 3 | 2 | Resolver + tests; feature-flagged inquiry (no user-visible change) |
| 4 | 3 | Upload/download API + storage wiring + tests |
| 5 | 4 | Legacy dual-read + backfill scripts + MJV/REC API aliases |
| 6 | 5a | PAV/REV/PCV manual upload + inquiry `false` when required |
| 7 | 5b | Stock manual upload |
| 8 | 6 | COL evidence + POST PAY-IN gating + inquiry `archiveAvailable` |

---

## Verification checklist (release)

- [ ] Phase 0 sign-off recorded
- [ ] Migration reversible / documented on dev
- [ ] Tri-state tests pass for each wired `documentKind`
- [ ] No new posting side effects in archive upload path
- [ ] MJV/REC parity with legacy before dropping fallback (future)
- [ ] COL UAT: disabled POST PAY-IN → upload → enabled → post → closed
- [ ] `npx tsc --noEmit`, targeted jest, `npm run build` per PR
- [ ] [FINANCE_DOCUMENT_AUDIT_MATRIX.md](./FINANCE_DOCUMENT_AUDIT_MATRIX.md) updated per phase

---

## Document history

| Date | Change |
|------|--------|
| 2026-06-30 | Initial implementation plan from approved vault design |
