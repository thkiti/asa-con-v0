# Reconciliation Snapshots (Phase 18)

Status: **Done** — manual capture, frozen read-only history, CSV export; Phase 19A snapshot UI polish  
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
| `/finance/reconciliation/snapshots` | [`ReconciliationSnapshotsPage.tsx`](../components/finance/ReconciliationSnapshotsPage.tsx) | List headers, branch filter, compare selection, link to detail |
| `/finance/reconciliation/snapshots/[id]` | [`ReconciliationSnapshotDetailView.tsx`](../components/finance/ReconciliationSnapshotDetailView.tsx) | Frozen metadata, collapsible sections, dashboard filters, issues from payload |
| `/finance/reconciliation/snapshots/compare` | [`ReconciliationSnapshotCompareView.tsx`](../components/finance/ReconciliationSnapshotCompareView.tsx) | Client-side diff of two snapshots (`?left=&right=`) |

Finance hub [`/finance`](../app/(main)/finance/page.tsx) links to snapshots.

### Client helpers

| Module | Role |
|--------|------|
| [`lib/finance-ui/reconciliation-snapshots.ts`](../lib/finance-ui/reconciliation-snapshots.ts) | Scope validation, capture body, row mappers, CSV export, compare diff helpers, pagination |
| [`lib/finance-ui/fetchers.ts`](../lib/finance-ui/fetchers.ts) | `fetchReconciliationSnapshots`, `fetchReconciliationSnapshotById`, `createReconciliationSnapshot` |
| [`components/finance/reconciliation-snapshot-ui.tsx`](../components/finance/reconciliation-snapshot-ui.tsx) | Shared collapsible sections, badges, skeletons, compare delta chips |

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
| **Compare uses payload only** | `ReconciliationSnapshotCompareView` diffs two stored payloads — no live fetch, no compare API |
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
4. Open `/finance/reconciliation/snapshots` — new row listed with summary chips and branch filter.
5. Select two snapshots — **Compare selected** links to compare page with both ids.
6. Open detail — confirm banner “no live fetch”, sticky summary, collapsible sections, wired dashboard filters.
7. Click dashboard row — issues filter by domain from payload (no `GET .../issues`).
8. When issues exceed 50 — **Show more issues** appears; CSV export still includes all filtered issues.
9. Open compare — header metric deltas and row/issue change tables render from frozen payloads only.
10. Export CSV — downloads only.
11. Confirm no Fix / Reconcile / Post buttons anywhere on snapshot pages.

---

## 8. Phase 19A — Snapshot UI polish

Status: **Done** — history list polish, detail UX, client-side compare, performance cleanup

Phase 19A is **UI-only**. It does not change snapshot capture, payload shape, reconciliation kernel math, or API contracts from Phase 18.

### Scope

| In scope | Out of scope |
|----------|--------------|
| History list layout, filters, badges, skeleton loading | New snapshot kinds or scheduled capture |
| Detail page collapsible sections, sticky summary, wired filters | Live reconciliation refresh on detail |
| Compare page with client-side diff | Server-side compare API |
| Shared UI primitives and pagination for large issue lists | Virtualization or snapshot delete/edit |

### History page (`ReconciliationSnapshotsPage`)

- Branch filter with apply/clear; sticky table header.
- Per-row summary chips: matched, variance, issue counts.
- `MANUAL` kind badge; formatted scope and capture time via shared formatters.
- Compare entry: checkbox column (max 2 selected), **Compare selected** button, **Open compare** link.
- Skeleton rows while loading; richer empty state with link back to live dashboard.

Shared formatters live in [`lib/finance-ui/reconciliation-snapshots.ts`](../lib/finance-ui/reconciliation-snapshots.ts): `formatSnapshotScope`, `formatSnapshotDisplayTitle`, `formatSnapshotKindLabel`; dates via `formatDateTime` in [`lib/finance-ui/format.ts`](../lib/finance-ui/format.ts).

### Detail page (`ReconciliationSnapshotDetailView`)

- Promoted title/scope header with kind badge.
- Amber banner: frozen capture, no live fetch.
- Sticky summary strip: matched, variance rows, issues, total variance.
- Collapsible `<details>` sections: Metadata, Aggregate totals, Dashboard summary, Dashboard rows, Transaction issues.
- Aggregate mini-cards from `payload.inventoryResult` / `payload.salesResult`.
- Dashboard category + status filters wired on frozen rows (previously hardcoded to `all` / `ALL`).
- Row click highlights dashboard row and filters issues by domain (unchanged Phase 18 behavior, now with row highlight).
- Loading skeleton while fetching snapshot by id.

Detail still reads **payload only** — never calls `fetchReconciliationDashboard` or `fetchReconciliationIssues`.

### Compare page (`ReconciliationSnapshotCompareView`)

Route: `/finance/reconciliation/snapshots/compare?left=<id>&right=<id>`

- Loads two snapshots via existing GET detail APIs.
- All diff logic runs in the browser from frozen payloads — no compare API, no live reconciliation fetch.
- Side-by-side snapshot cards with links to each detail page.
- Sticky header metric deltas (right − left): matched, variance rows, issues, dashboard rows, total variance.
- Collapsible sections for dashboard row changes and issue changes with kind filter (all / added / removed / changed).
- Picker UI when `left` or `right` query param is missing (populated from snapshot list headers).

Compare helpers in [`lib/finance-ui/reconciliation-snapshots.ts`](../lib/finance-ui/reconciliation-snapshots.ts):

| Helper | Purpose |
|--------|---------|
| `computeSnapshotCompareResult` | Single bundled diff (rows, issues, metrics, counts) |
| `compareSnapshotHeaderMetrics` | Header field deltas |
| `diffDashboardRows` / `diffSnapshotIssues` | Row/issue added/removed/changed classification by id |
| `filterDashboardRowDiffs` / `filterIssueDiffs` | UI filter by change kind |
| `formatCountDelta` / `formatAmountDelta` | Display helpers for delta chips |

### Performance and shared UI (`reconciliation-snapshot-ui.tsx`)

- Extracted shared components: `CollapsibleSection`, `SnapshotKindBadge`, `SnapshotDetailSkeleton`, `CompareSkeleton`, `DiffKindBadge`, `DeltaChip`.
- Compare view memoizes via one `computeSnapshotCompareResult` call instead of separate per-field diffs.
- Issue lists paginate client-side when count exceeds **50** (`SNAPSHOT_UI_ISSUES_PAGE_SIZE`):
  - Detail **Transaction issues** section: show first 50, **Show more issues** for remainder.
  - Compare **Issue changes** table: same pattern.
  - Resets when dashboard row selection or filters change.
  - CSV export always uses the full filtered list, not just the visible page.

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


## 9. Related docs

- Live dashboard: [16_FINANCE_RECONCILIATION.md](./16_FINANCE_RECONCILIATION.md)
- Live drill-down: [17_RECONCILIATION_DRILLDOWN.md](./17_RECONCILIATION_DRILLDOWN.md)
- Policy: [12_FINANCE_RECONCILIATION_AND_CLOSE_POLICY.md](./12_FINANCE_RECONCILIATION_AND_CLOSE_POLICY.md)
