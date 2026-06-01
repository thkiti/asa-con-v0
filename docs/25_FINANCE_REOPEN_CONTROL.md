# Finance — Period Reopen Control (Phase 21A)

Phase 21A adds **controlled reopen** with immutable audit evidence, while keeping the posting kernel unchanged. Posting is allowed only when `AccountingPeriod.status === OPEN` via [`assertPostingPeriodOpen`](../lib/finance/posting-period.ts).

Related docs:

- [15_FINANCE_PERIODS.md](./15_FINANCE_PERIODS.md) — period lifecycle
- [21_FINANCE_CLOSE_WORKFLOW.md](./21_FINANCE_CLOSE_WORKFLOW.md) — close workflow
- [22_FINANCE_CLOSE_GATE.md](./22_FINANCE_CLOSE_GATE.md) — HARD close gate
- [23_FINANCE_CLOSE_EVIDENCE.md](./23_FINANCE_CLOSE_EVIDENCE.md) — close evidence (append-only history)
- [24_FINANCE_CLOSE_EVIDENCE_EXPORT.md](./24_FINANCE_CLOSE_EVIDENCE_EXPORT.md) — export/print from loaded evidence

## Reopen matrix

| From | To | Role | Reason | Evidence |
|------|-----|------|--------|----------|
| `OPEN` | `OPEN` | — | — | None (idempotent) |
| `SOFT_CLOSED` | `OPEN` | `HO_FINANCE` or `HO_ADMIN` | Required | `AccountingPeriodReopenEvidence` |
| `HARD_CLOSED` | `SOFT_CLOSED` | `HO_ADMIN` only (via approved request in 21B) | Required | `AccountingPeriodReopenEvidence` |
| `HARD_CLOSED` | `OPEN` | — | — | **Rejected** (no direct reopen) |

HARD reopen reads the **latest** close evidence row (by `closedAt` desc) for `closeEvidenceId` — read-only; close evidence is never updated on reopen.

## Close evidence — append-only history

Each **successful** transition into `HARD_CLOSED` inserts a new `AccountingPeriodCloseEvidence` row. Prior rows are never updated, deleted, or regenerated.

Idempotent HARD close (period already `HARD_CLOSED`) does not insert another row.

## Example lifecycle

```
OPEN
→ SOFT_CLOSED
→ HARD_CLOSED          ← CloseEvidence #1
→ SOFT_CLOSED          ← ReopenEvidence #1 (HARD→SOFT)
→ OPEN                 ← ReopenEvidence #2 (SOFT→OPEN)
→ SOFT_CLOSED
→ HARD_CLOSED          ← CloseEvidence #2
```

Expected counts: **2** close evidence rows, **2** reopen evidence rows (distinct ids).

## API

| Method | Path | Behavior |
|--------|------|----------|
| `PATCH` | `/api/finance/periods` | `action: "REOPEN"` requires `reason`; actor from session |
| `GET` | `/api/finance/periods/[id]/close-evidence` | Latest close evidence (backward compatible) |
| `GET` | `/api/finance/periods/[id]/close-evidence/history` | All close events, newest first |
| `GET` | `/api/finance/periods/[id]/close-evidence/[evidenceId]` | One immutable close record |
| `GET` | `/api/finance/periods/[id]/reopen-evidence` | Reopen audit list |

## Domain modules

- [`lib/finance/period-close.ts`](../lib/finance/period-close.ts) — close/reopen orchestration inside caller transactions
- [`lib/finance/close-evidence.ts`](../lib/finance/close-evidence.ts) — append-only HARD close evidence
- [`lib/finance/reopen-evidence.ts`](../lib/finance/reopen-evidence.ts) — append-only reopen evidence

## UI

- `HardReopenConfirmDialog` / `SoftReopenConfirmDialog` — reason required before PATCH
- `/finance/periods/[id]/reopen-evidence` — reopen history
- Close evidence history and per-record views; export/print uses the **loaded** evidence row only (Phase 20E unchanged)

## Out of scope (21A)

- Posting override into closed periods
- CSV export for reopen/close history lists
- Automated reopen workflows

Phase 21B adds HARD reopen approval workflow — see [26_FINANCE_REOPEN_APPROVAL.md](./26_FINANCE_REOPEN_APPROVAL.md).
