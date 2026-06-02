# Stock Document Workflow Foundation (Phase 23B-0)

Status: Done  
Scope: Schema (`CANCELLED` + cancel audit), sole status writer, transition policy, architecture guards  
Related: [07_STOCK_DOCUMENT_POSTING.md](./07_STOCK_DOCUMENT_POSTING.md), [ARCHITECTURE_GUARDS.md](./ARCHITECTURE_GUARDS.md) §2

---

## Locked lifecycle decisions (Phase 23A)

| # | Rule |
|---|------|
| 1 | **DRAFT** documents may be **deleted** (`stockDocument.delete`) |
| 2 | **SUBMITTED** and later (pre-POSTED) must **cancel → `CANCELLED`**, never delete |
| 3 | **POSTED** is immutable — no edit, cancel, or delete |
| 4 | **Only POST** creates `StockTransaction` |
| 5 | **CONFIRM** (and other workflow steps) do not create ledger entries |
| 6 | Print and screen share one ReadModel (Phase 23F) |

---

## Schema (23B-0)

### `DocStatus`

Added terminal void state: `CANCELLED`.

### `StockDocument` cancel audit

| Field | Type |
|-------|------|
| `cancelledAt` | `DateTime?` |
| `cancelledByStaffId` | `String?` |
| `cancelReason` | `String?` (`@db.Text`) |

Migration: `20260602120000_stock_document_cancelled`.

---

## Module layout

```
lib/stock/document/
├── document-types.ts              # Workflow actions, void resolution types
├── document-errors.ts             # DocumentError, DocumentPolicyError
├── document-transition-policy.ts  # POSTABLE_BY_DOC_TYPE, matrix, void helpers
└── document-status.ts             # Sole stockDocument.update/delete with status
```

### Status writer (`document-status.ts`)

| API | Purpose |
|-----|---------|
| `applyPostedTransition` | POST → `POSTED` + posted audit + implicit confirm from `SUBMITTED` |
| `applyCancelledTransition` | SUBMITTED+ → `CANCELLED` + cancel audit |
| `deleteDraftDocument` | DRAFT hard delete (cascade lines) |

**Only** this module may call `tx.stockDocument.update` or `tx.stockDocument.delete` in production code.

### Posting orchestration (`posting.ts`)

Unchanged behavior: validate → ledger → `applyPostedTransition` → optional finance voucher. No direct status writes.

### Policy (`document-transition-policy.ts`)

Pure functions: `assertTransitionAllowed`, `resolveVoidAction`, `isTerminalStatus`, `isImmutableStatus`, `POSTABLE_BY_DOC_TYPE` (consumed by `validation.ts`).

---

## Void resolution

| Current status | Resolution |
|----------------|------------|
| `DRAFT` | `DELETE` → `deleteDraftDocument()` |
| `SUBMITTED`, `SHIPPED`, `CONFIRMED`, `RECEIVED`, `TRANSFERRED` | `CANCEL` → `applyCancelledTransition()` |
| `POSTED`, `CANCELLED` | `FORBIDDEN` |

---

## Transition matrix (reference)

Workflow actions (SUBMIT, SHIP, CONFIRM, RECEIVE, TRANSFER) are **defined and tested** in policy; HTTP/workflow callers arrive in Phase 23B.

| Action | From (typical) | To |
|--------|----------------|-----|
| SUBMIT | `DRAFT` | `SUBMITTED` |
| SHIP | `SUBMITTED` | `SHIPPED` (TRO, PUR, TRI) |
| CONFIRM | `SHIPPED` | `CONFIRMED` (TRO, ADJ) |
| RECEIVE | `SHIPPED` | `RECEIVED` (PUR, TRI) |
| TRANSFER | `CONFIRMED` | `TRANSFERRED` (ADJ) |
| POST | postable set per doc type | `POSTED` |
| CANCEL | pre-posted workflow statuses | `CANCELLED` |

**Global:** no transition from `POSTED` or `CANCELLED`; no transition to `DRAFT`.

---

## Architecture enforcement

Automated audits (`STOCK_DOCUMENT_UPDATE`, `STOCK_DOCUMENT_DELETE`) allowlist only `lib/stock/document/document-status.ts` (plus `scripts/`). Wired in `runArchitectureAudits()`.

---

## Out of scope (23B-0)

- `document-save.ts`, `document-workflow.ts`, API routes, UI, ReadModel
- `shippedAt` / `receivedAt` columns
- Period gates on SAVE/SEND

Phase 23B builds workflow and save on this foundation without changing the status-writer allowlist.
