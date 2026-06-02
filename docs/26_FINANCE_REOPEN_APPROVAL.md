# Finance — Reopen Approval Workflow (Phase 21B)

Phase 21B adds **request → approve → execute** for HARD reopen on top of Phase 21A. SOFT reopen remains direct when policy allows.

Related docs:

- [25_FINANCE_REOPEN_CONTROL.md](./25_FINANCE_REOPEN_CONTROL.md) — Phase 21A execution kernel and evidence
- [15_FINANCE_PERIODS.md](./15_FINANCE_PERIODS.md) — period lifecycle
- [23_FINANCE_CLOSE_EVIDENCE.md](./23_FINANCE_CLOSE_EVIDENCE.md) — immutable close evidence
- [27_FINANCE_PERIOD_AUDIT_TIMELINE.md](./27_FINANCE_PERIOD_AUDIT_TIMELINE.md) — Phase 22A read-only period audit timeline

## Workflow (HARD reopen)

| Step | Actor | Effect |
|------|-------|--------|
| Request | HO_FINANCE or HO_ADMIN | `AccountingPeriodReopenRequest` → `PENDING`; period stays `HARD_CLOSED` |
| Approve | HO_ADMIN (≠ requester) | Executes `reopenAccountingPeriod` → `SOFT_CLOSED`; request → `EXECUTED`; reopen evidence append-only |
| Reject | HO_ADMIN | Request → `REJECTED`; period unchanged |
| Cancel | Requester | Request → `CANCELLED`; period unchanged |

Direct `PATCH REOPEN` from `HARD_CLOSED` returns **409** `REOPEN_APPROVAL_REQUIRED`.

SOFT reopen (`SOFT_CLOSED → OPEN`) remains direct in default policy — reason + reopen evidence as in 21A.

## Request audit identifier

Each request gets a human-readable **`requestNo`**: `RRO-{periodKey}-{seq}` (e.g. `RRO-2026-05-0001`), unique across the system.

## Explicit audit fields

| Outcome | Fields set |
|---------|------------|
| Request | `requestedAt`, `requestedByStaffId`, `requestedByName`, `requestedByRole`, `reason` |
| Approve / execute | `approvedAt`, `approvedBy*`, `approvalNote`, `executedAt`, `reopenEvidenceId` |
| Reject | `rejectedAt`, `rejectedBy*`, `rejectionNote` |
| Cancel | `cancelledAt`, `cancelledBy*` |

Reopen evidence payload may include `reopenRequestId`, `requestNo`, and an `approval` snapshot when executed via approval.

## Policy

Module: [`lib/finance/reopen-approval-policy.ts`](../lib/finance/reopen-approval-policy.ts)

| Policy | HARD reopen | SOFT reopen |
|--------|-------------|-------------|
| Default | Approval required | Direct (21A) |
| Strict (tests / future) | Approval required | Approval required |

`requireSeparateApprover: true` in default — approver `staffId` must differ from requester.

## API

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/api/finance/periods/[id]/reopen-requests` | Create `PENDING` request `{ reason }` |
| `GET` | `/api/finance/periods/[id]/reopen-requests` | List requests; optional `?status=PENDING` |
| `GET` | `/api/finance/periods/[id]/reopen-requests/[requestId]` | One request |
| `PATCH` | `.../reopen-requests/[requestId]` | `{ action: APPROVE \| REJECT \| CANCEL, approvalNote?, rejectionNote? }` |
| `PATCH` | `/api/finance/periods` | `REOPEN` blocked from `HARD_CLOSED`; SOFT direct unchanged |

## Domain modules

- [`lib/finance/reopen-request.ts`](../lib/finance/reopen-request.ts) — request lifecycle
- [`lib/finance/reopen-approval-policy.ts`](../lib/finance/reopen-approval-policy.ts) — centralized policy
- [`lib/finance/period-close.ts`](../lib/finance/period-close.ts) — single execution kernel (`reopenAccountingPeriod`)
- [`lib/finance/reopen-evidence.ts`](../lib/finance/reopen-evidence.ts) — append-only evidence on execute only

## UI

- `HardReopenRequestDialog` — submit request from period admin
- `/finance/periods/[id]/reopen-requests` — list + approve/reject/cancel
- Period table: **Reopen requests** link for `HARD_CLOSED` rows; pending badge when `PENDING` exists

## Invariants (unchanged from 21A)

- `AccountingPeriodCloseEvidence` immutable, append-only
- `AccountingPeriodReopenEvidence` append-only, created on execute only
- `assertPostingPeriodOpen` — posting only when `OPEN`
- Reopen matrix at execution: `HARD→SOFT`, `SOFT→OPEN`; no `HARD→OPEN`

## Out of scope (21B)

- Notifications, auto-expiry, multi-level approval
- Enabling strict SOFT approval in production default (architecture-ready)
- Posting override into closed periods
