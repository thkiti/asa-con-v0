# Finance Period Audit Export / Print (Phase 22B)

Status: **Done** — browser CSV pack and audit print composed from existing read models  
Scope: Read-only composition layer — no schema, no export activity tracking, no workflow changes  
Related: [15_FINANCE_PERIODS.md](./15_FINANCE_PERIODS.md), [27_FINANCE_PERIOD_AUDIT_TIMELINE.md](./27_FINANCE_PERIOD_AUDIT_TIMELINE.md), [23_FINANCE_CLOSE_EVIDENCE.md](./23_FINANCE_CLOSE_EVIDENCE.md), [24_FINANCE_CLOSE_EVIDENCE_EXPORT.md](./24_FINANCE_CLOSE_EVIDENCE_EXPORT.md), [25_FINANCE_REOPEN_CONTROL.md](./25_FINANCE_REOPEN_CONTROL.md), [26_FINANCE_REOPEN_APPROVAL.md](./26_FINANCE_REOPEN_APPROVAL.md)

Phase 22B adds a **period audit export bundle** and client-side CSV/print on the audit timeline page. It composes Phase 22A timeline data with summary indexes from close evidence, reopen evidence, and reopen request readers. Full close evidence payload export remains Phase 20E on the close evidence page.

---

## 1. Purpose

| Goal | Description |
|------|-------------|
| Audit export bundle | Single JSON DTO for period lifecycle review |
| CSV pack | Five browser-downloaded CSVs (metadata, timeline, close index, reopen evidence, reopen requests) |
| Audit print | Print-friendly summary from the same bundle |
| Composition only | No new finance business rules; no mutations |

**Non-goals:** `AuditLog` table, export activity tracking, server `?format=csv`, PDF/ZIP, duplicating 20E payload CSVs in the 22B pack.

---

## 2. Scope

| In scope | Out of scope |
|----------|--------------|
| `getPeriodAuditExportByPeriodId` | Schema / migrations |
| `GET /api/finance/periods/[id]/audit-export` | Close/reopen/posting/approval behavior changes |
| Timeline page export + print actions | Export audit log or download tracking |
| Summary rows for close/reopen tables | Rebuilding close evidence payloads |

---

## 3. Source of truth

The bundle is built at request time from **existing read paths only**:

1. `getPeriodAuditTimelineByPeriodId` — period summary + chronological timeline (22A)
2. `listCloseEvidenceByPeriodId` — mapped to `PeriodAuditCloseEvidenceSummary` (index fields only)
3. `listReopenEvidenceByPeriodId` — mapped to `PeriodAuditReopenEvidenceSummary`
4. `listReopenRequestsByPeriodId` — mapped to `PeriodAuditReopenRequestSummary`

No alternate timeline builder. No live checklist or reconciliation recompute. Close evidence **detail** export/print stays on `/finance/periods/[id]/close-evidence` (20E).

---

## 4. API

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/api/finance/periods/[id]/audit-export` | `{ export: PeriodAuditExportBundle }` |

`PeriodAuditExportBundle` fields:

- `exportVersion` — `1`
- `exportedAt` — ISO timestamp when bundle was built
- `period`, `timeline` — same shapes as 22A timeline API
- `closeEvidence`, `reopenEvidence`, `reopenRequests` — summary arrays
- `counts` — row counts mirroring array lengths

Errors: `PERIOD_NOT_FOUND` → 404 (via timeline step).

---

## 5. Domain

- [`lib/finance/period-audit-export.ts`](../lib/finance/period-audit-export.ts) — `getPeriodAuditExportByPeriodId`
- [`lib/finance/period-audit-export-types.ts`](../lib/finance/period-audit-export-types.ts) — bundle and summary types

---

## 6. UI

- Page: `/finance/periods/[id]/timeline` — loads timeline + export bundle in parallel
- [`lib/finance-ui/period-audit-export.ts`](../lib/finance-ui/period-audit-export.ts) — CSV serializers
- [`components/finance/period-audit-export-ui.tsx`](../components/finance/period-audit-export-ui.tsx) — action bar, print header/body
- Fetcher: `fetchPeriodAuditExport` in [`lib/finance-ui/period-fetchers.ts`](../lib/finance-ui/period-fetchers.ts)

CSV filenames use slug `period-audit-{branch}-{periodKey}` with suffixes:

- `-report-metadata.csv`
- `-timeline-events.csv`
- `-close-evidence-index.csv`
- `-reopen-evidence.csv`
- `-reopen-requests.csv`

---

## 7. Tests

| File | Coverage |
|------|----------|
| `__tests__/lib/finance/period-audit-export.test.ts` | Composition, counts, read-only |
| `__tests__/app/api/finance/period-audit-export-route.test.ts` | GET route, no writes |
| `__tests__/lib/finance-ui/period-audit-export.test.ts` | CSV pack shape |
| `__tests__/lib/finance-ui/period-fetchers.test.ts` | Audit-export fetcher URL |

---

## 8. Invariants

- Read-only queries only; export build does not mutate state
- No new tables or finance rules
- Does not change close gate, reopen workflow, posting lock, or period lifecycle APIs
- 20E remains the place for full `CloseEvidencePayloadV1` CSV export
