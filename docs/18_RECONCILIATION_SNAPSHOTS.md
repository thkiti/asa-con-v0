# Reconciliation Snapshots (Phase 18)

Status: **Done** — manual capture, frozen read-only history, CSV export  
Scope: Persist reconciliation dashboard + transaction issues at capture time  
Related: [16_FINANCE_RECONCILIATION.md](./16_FINANCE_RECONCILIATION.md), [17_RECONCILIATION_DRILLDOWN.md](./17_RECONCILIATION_DRILLDOWN.md), [15_FINANCE_PERIODS.md](./15_FINANCE_PERIODS.md)

---

## 1. Purpose

Phase 18 adds **frozen reconciliation snapshots** — point-in-time captures of aggregate dashboard rows and transaction-level issues for audit and month-end review.

| Goal | Description |
|------|-------------|
| Manual capture | Finance admin captures current reconciliation scope from the live dashboard |
| Frozen history | List and detail views read stored JSON payload only |
| CSV export | Client-side export of frozen dashboard rows and issues |
| Domain drill-down | Row click filters issues from frozen payload (no live issues API) |

**Non-goals:** scheduled capture, snapshot delete/edit, GL posting, auto-adjust, or re-running kernel on detail view.

---

## 2. Schema

Model: `ReconciliationSnapshot` in [`prisma/schema.prisma`](../prisma/schema.prisma)

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `kind` | `ReconciliationSnapshotKind` | Currently `MANUAL` only |
| `branchId` | string? | Optional branch scope |
| `fromDate` / `toDate` | DateTime? | Resolved date range |
| `periodKey` | string? | `YYYY-MM` when captured by period |
| `label` / `note` | string? | Optional user metadata |
| `checkedSales` / `checkedStockDocuments` / `issueCount` | int | Issue scan counts |
| `dashboardRowCount` / `matchedCount` / `varianceCount` | int | Dashboard summary |
| `totalVarianceAmount` | Decimal | Sum of absolute variances |
| `payloadVersion` | int | Currently `1` |
| `inventoryResult` / `salesResult` | Json | Aggregate API results at capture |
| `dashboardRows` | Json | Normalized dashboard rows |
| `issuesPayload` | Json | Full issues result at capture |
| `createdAt` / `createdByStaffId` | audit | Capture timestamp and staff |

Migration: [`prisma/migrations/20260527120000_reconciliation_snapshots/`](../prisma/migrations/20260527120000_reconciliation_snapshots/)

### Database push

After pulling Phase 18 schema changes:

```bash
npm run db:generate
npx prisma migrate deploy   # or db push in local dev
```

Snapshots require the `ReconciliationSnapshot` table before capture or list APIs succeed.

---

## 3. Payload (v1)

Types: [`lib/finance/reconciliation-snapshot-types.ts`](../lib/finance/reconciliation-snapshot-types.ts)

```typescript
type ReconciliationSnapshotPayloadV1 = {
  inventoryResult: InventoryReconciliationResult
  salesResult: SalesReconciliationResult
  dashboardRows: SnapshotDashboardRow[]
  issuesPayload: SnapshotIssuesPayload
}
```

Capture kernel: [`captureReconciliationSnapshotPayload`](../lib/finance/reconciliation-snapshot-capture.ts) — parallel aggregate + issues enrichment, **read-only** queries only.

---

## 4. API

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/finance/reconciliation/snapshots` | List snapshot headers (`branchId?`, `limit?`) |
| GET | `/api/finance/reconciliation/snapshots/[id]` | Full detail + payload |
| POST | `/api/finance/reconciliation/snapshots` | Manual capture (**201**) |

POST body (scope — **periodKey OR from+to, not both**):

```json
{
  "branchId": "optional",
  "periodKey": "2026-05",
  "label": "Month-end review",
  "note": "Optional audit note"
}
```

Or:

```json
{
  "from": "2026-05-01",
  "to": "2026-05-31",
  "label": "Ad-hoc range"
}
```

POST requires period-admin session (`requirePeriodAdminActor`). GET list/detail are unauthenticated in dev (same pattern as other finance read APIs).

**No PATCH/DELETE.** Capture is the only mutation.

---

## 5. UI routes

| Route | Component | Behavior |
|-------|-----------|----------|
| `/finance/reconciliation` | [`ReconciliationPage.tsx`](../components/finance/ReconciliationPage.tsx) | Live dashboard + **Capture snapshot** when scope valid |
| `/finance/reconciliation/snapshots` | [`ReconciliationSnapshotsPage.tsx`](../components/finance/ReconciliationSnapshotsPage.tsx) | List headers, refresh, link to detail |
| `/finance/reconciliation/snapshots/[id]` | [`ReconciliationSnapshotDetailView.tsx`](../components/finance/ReconciliationSnapshotDetailView.tsx) | Frozen metadata, dashboard table, issues from payload |

Finance hub [`/finance`](../app/(main)/finance/page.tsx) links to snapshots.

### Client helpers

| Module | Role |
|--------|------|
| [`lib/finance-ui/reconciliation-snapshots.ts`](../lib/finance-ui/reconciliation-snapshots.ts) | Scope validation, capture body, row mappers, CSV export |
| [`lib/finance-ui/fetchers.ts`](../lib/finance-ui/fetchers.ts) | `fetchReconciliationSnapshots`, `fetchReconciliationSnapshotById`, `createReconciliationSnapshot` |

### Capture flow (manual)

1. User loads live dashboard at `/finance/reconciliation` and applies filters.
2. When scope is valid (`periodKey` or `from`+`to`), **Capture snapshot** appears.
3. Optional label; POST creates snapshot with frozen payload.
4. User opens `/finance/reconciliation/snapshots` to browse history.

### Detail flow (frozen)

1. User opens snapshot detail by id.
2. Dashboard table renders `payload.dashboardRows` — **no** `fetchReconciliationDashboard`.
3. Issues table renders `payload.issuesPayload.issues` — **no** `fetchReconciliationIssues`.
4. Row click filters issues by domain using `issueMatchesDomain` on frozen rows only.
5. Export CSV buttons build files in the browser.

---

## 6. Read-only guarantees

| Guarantee | Enforcement |
|-----------|-------------|
| **No posting** | Snapshot routes do not import `lib/finance/posting.ts` |
| **Detail uses payload only** | `ReconciliationSnapshotDetailView` never calls live reconciliation fetchers |
| **Only POST for capture** | No PATCH/DELETE on snapshot API |
| **No fix/reconcile UI** | Snapshot pages have no Fix, Reconcile, or Post buttons |
| **CSV is client-side** | `downloadCsv` / export helpers — no server write |
| **Capture is explicit** | Manual button after live dashboard load; no background jobs |

Live reconciliation (Phases 16–17) remains the source for current operational vs GL state. Snapshots are historical records only.

---

## 7. Manual verification

1. Run migration / `db push` for `ReconciliationSnapshot`.
2. Open `/finance/reconciliation`, apply `periodKey` or date range, load dashboard.
3. Click **Capture snapshot** — Network: `POST .../snapshots` → 201.
4. Open `/finance/reconciliation/snapshots` — new row listed.
5. Open detail — confirm banner “no live fetch”, frozen tables, read-only note.
6. Click dashboard row — issues filter by domain from payload (no `GET .../issues`).
7. Export CSV — downloads only.
8. Confirm no Fix / Reconcile / Post buttons anywhere on snapshot pages.

---



### Development staff fallback (local smoke only)

Cookie sessions (Phase 2 stub) do not guarantee a matching `Staff` row. On `POST .../snapshots`, when `NODE_ENV === "development"` and the session staff key cannot be resolved, the API upserts a deterministic staff record:

| Field | Value |
|-------|-------|
| `staffId` (login code) | `DEV` |
| `name` | Dev Admin |
| `role` | `HO_ADMIN` |

Production (and test/CI) still require a real active `Staff` row; `requirePeriodAdminActor` is unchanged. Implementation: `lib/auth/period-admin-staff.ts` (`resolvePeriodAdminStaffId`).

For local smoke, set period-admin cookies (`role=HO_FINANCE` or `HO_ADMIN`); any `staffId` in the cookie is fine in development — first capture auto-seeds `DEV` if needed.


## 8. Related docs

- Live dashboard: [16_FINANCE_RECONCILIATION.md](./16_FINANCE_RECONCILIATION.md)
- Live drill-down: [17_RECONCILIATION_DRILLDOWN.md](./17_RECONCILIATION_DRILLDOWN.md)
- Policy: [12_FINANCE_RECONCILIATION_AND_CLOSE_POLICY.md](./12_FINANCE_RECONCILIATION_AND_CLOSE_POLICY.md)
