# Finance - Period Audit Timeline (Phase 22A)

Phase 22A adds a **read-only audit timeline** for one accounting period. Events are derived from existing immutable and workflow tables - no new schema, no mutations, no close/reopen behavior changes.

Related docs:

- [15_FINANCE_PERIODS.md](./15_FINANCE_PERIODS.md) - period lifecycle
- [23_FINANCE_CLOSE_EVIDENCE.md](./23_FINANCE_CLOSE_EVIDENCE.md) - close evidence
- [25_FINANCE_REOPEN_CONTROL.md](./25_FINANCE_REOPEN_CONTROL.md) - reopen evidence
- [26_FINANCE_REOPEN_APPROVAL.md](./26_FINANCE_REOPEN_APPROVAL.md) - reopen approval workflow
- [28_FINANCE_PERIOD_AUDIT_EXPORT.md](./28_FINANCE_PERIOD_AUDIT_EXPORT.md) - Phase 22B export bundle, CSV, print

## Scope

| In scope | Out of scope |
|----------|--------------|
| Chronological merge of period, close evidence, reopen evidence, reopen requests | `AuditLog` table (not in schema) |
| GET API + review UI | Rebuild/regenerate close evidence |
| Link to 22B export on same timeline page | Server CSV download API |
| Stable timeline item shape | Posting lock / close gate bypass |

## Event catalog

| Type | Source | Notes |
|------|--------|-------|
| `period_opened` | `AccountingPeriod.openedAt` | No actor recorded at bootstrap |
| `period_soft_closed` | `AccountingPeriod` | Only when current `status === SOFT_CLOSED` and `closedAt` set |
| `period_hard_closed` | `AccountingPeriodCloseEvidence` | Per HARD close row |
| `close_evidence_generated` | `AccountingPeriodCloseEvidence` | Same row; `occurredAt` uses `createdAt` |
| `reopen_requested` | `AccountingPeriodReopenRequest` | |
| `reopen_approved` | Request `approvedAt` | When set |
| `reopen_rejected` | Request `rejectedAt` | When set |
| `reopen_canceled` | Request `cancelledAt` | When set |
| `period_reopened` | `AccountingPeriodReopenEvidence` | Includes transition and optional request ref |

Sorted ascending by `occurredAt`, then `id`.

### SOFT close limitation

SOFT close does not write an immutable audit row. After HARD close, `closedAt` reflects the HARD close time. Historical soft-close timestamps are not recoverable without schema changes. The timeline shows `period_soft_closed` only while the period remains `SOFT_CLOSED`.

## API

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/api/finance/periods/[id]/timeline` | `{ period, timeline }` |

Errors: `PERIOD_NOT_FOUND` -> 404.

## Domain

- [`lib/finance/period-audit-timeline.ts`](../lib/finance/period-audit-timeline.ts) - `getPeriodAuditTimelineByPeriodId`
- [`lib/finance/period-audit-timeline-types.ts`](../lib/finance/period-audit-timeline-types.ts) - item types

## UI

- `/finance/periods/[id]/timeline` - read-only timeline page; Phase 22B CSV pack + print use `GET .../audit-export` on the same page
- Period table link: **Audit timeline** (all periods)

## Tests

| File | Coverage |
|------|----------|
| `__tests__/lib/finance/period-audit-timeline.test.ts` | Sort order, events, read-only, 404 |
| `__tests__/app/api/finance/period-timeline-route.test.ts` | GET route, no writes |
| `__tests__/components/finance/period-table.test.tsx` | Navigation link |
| `__tests__/lib/finance-ui/period-fetchers.test.ts` | Fetcher URL |

## Invariants

- Read-only queries only
- Does not mutate accounting state or evidence
- Does not change close/reopen workflows
