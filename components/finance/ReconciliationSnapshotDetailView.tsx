"use client"

import { useEffect, useMemo, useState } from "react"
import { fetchReconciliationSnapshotById } from "@/lib/finance-ui/fetchers"
import { formatAmount, formatDateTime } from "@/lib/finance-ui/format"
import {
  filterDashboardRows,
  summarizeDashboardRows,
  type ReconciliationDashboardFilter,
  type ReconciliationDashboardRow,
  type ReconciliationRowStatus,
} from "@/lib/finance-ui/reconciliation"
import {
  buildSnapshotEvidenceExport,
  downloadEvidenceCsvFiles,
} from "@/lib/finance-ui/reconciliation-export"
import { downloadCsv } from "@/lib/finance-ui/reconciliation-snapshots"
import {
  filterFrozenIssuesByDomain,
  formatSnapshotDisplayTitle,
  formatSnapshotScope,
  paginateList,
  SNAPSHOT_UI_ISSUES_PAGE_SIZE,
  snapshotIssuesToUiRows,
  snapshotRowsToDashboardRows,
} from "@/lib/finance-ui/reconciliation-snapshots"
import type { ReconciliationSnapshotDetail } from "@/lib/finance-ui/types"
import {
  CollapsibleSection,
  FROZEN_SNAPSHOT_DISCLAIMER,
  PrintAuditButton,
  SnapshotAuditPrintHeader,
  SnapshotDetailSkeleton,
  SnapshotKindBadge,
} from "./reconciliation-snapshot-ui"
import { ReconciliationDashboardTable } from "./ReconciliationDashboardTable"
import { ReconciliationIssuesTable } from "./ReconciliationIssuesTable"

const STATUS_OPTIONS: Array<ReconciliationRowStatus | "ALL"> = [
  "ALL",
  "MATCHED",
  "VARIANCE",
  "MISSING_SOURCE",
  "MISSING_GL",
]

const DOMAIN_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "inventory", label: "Inventory" },
  { value: "revenue", label: "Revenue" },
  { value: "tender", label: "Tender" },
]

type SnapshotEvidenceExportControlsProps = {
  snapshot: ReconciliationSnapshotDetail
}

function SnapshotEvidenceExportControls({
  snapshot,
}: SnapshotEvidenceExportControlsProps) {
  const [exporting, setExporting] = useState(false)

  const evidenceFiles = useMemo(
    () => buildSnapshotEvidenceExport(snapshot),
    [snapshot]
  )

  async function handleExportPack() {
    setExporting(true)
    try {
      await downloadEvidenceCsvFiles(evidenceFiles)
    } finally {
      setExporting(false)
    }
  }

  function handleExportSingle(index: number) {
    const file = evidenceFiles[index]
    if (!file) return
    downloadCsv(file.filename, file.content)
  }

  return (
    <div className="no-print rounded border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">Evidence export</p>
          <p className="mt-1 text-xs text-zinc-600">
            Frozen payload only โ€” metadata, summary, dashboard, and issues CSVs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintAuditButton />
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExportPack()}
            className="rounded border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {exporting ? "Exportingโ€ฆ" : "Export evidence pack"}
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleExportSingle(0)}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900"
        >
          Metadata CSV
        </button>
        <button
          type="button"
          onClick={() => handleExportSingle(1)}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900"
        >
          Summary CSV
        </button>
        <button
          type="button"
          onClick={() => handleExportSingle(2)}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900"
        >
          Dashboard CSV
        </button>
        <button
          type="button"
          onClick={() => handleExportSingle(3)}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900"
        >
          Issues CSV
        </button>
      </div>
    </div>
  )
}

type ReconciliationSnapshotDetailViewProps = {
  snapshot: ReconciliationSnapshotDetail
}

export function ReconciliationSnapshotDetailView({
  snapshot,
}: ReconciliationSnapshotDetailViewProps) {
  const [selectedRow, setSelectedRow] =
    useState<ReconciliationDashboardRow | null>(null)
  const [filter, setFilter] = useState<ReconciliationDashboardFilter>({
    domain: "all",
    status: "ALL",
  })
  const [issuesVisibleCount, setIssuesVisibleCount] = useState(
    SNAPSHOT_UI_ISSUES_PAGE_SIZE
  )

  const dashboardRows = useMemo(
    () => snapshotRowsToDashboardRows(snapshot.payload.dashboardRows),
    [snapshot.payload.dashboardRows]
  )

  const allIssues = useMemo(
    () => snapshotIssuesToUiRows(snapshot.payload.issuesPayload.issues),
    [snapshot.payload.issuesPayload.issues]
  )

  const visibleRows = useMemo(
    () => filterDashboardRows(dashboardRows, filter),
    [dashboardRows, filter]
  )

  const summary = useMemo(
    () => summarizeDashboardRows(visibleRows),
    [visibleRows]
  )

  const fullSummary = useMemo(
    () => summarizeDashboardRows(dashboardRows),
    [dashboardRows]
  )

  const visibleIssues = useMemo(() => {
    if (!selectedRow) {
      return allIssues
    }
    return filterFrozenIssuesByDomain(allIssues, selectedRow.domain)
  }, [allIssues, selectedRow])

  useEffect(() => {
    setIssuesVisibleCount(SNAPSHOT_UI_ISSUES_PAGE_SIZE)
  }, [selectedRow, filter.domain, filter.status])

  const issuesPagination = useMemo(
    () => paginateList(visibleIssues, issuesVisibleCount),
    [visibleIssues, issuesVisibleCount]
  )

  const snapshotTraceContext = useMemo(
    () => ({
      snapshotId: snapshot.id,
      capturedAt: snapshot.createdAt,
    }),
    [snapshot.createdAt, snapshot.id]
  )

  const { inventoryResult, salesResult } = snapshot.payload

  return (
    <div className="reconciliation-audit-print space-y-4">
      <SnapshotAuditPrintHeader snapshot={snapshot} />

      <header className="no-print">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-zinc-900">
            {formatSnapshotDisplayTitle(snapshot)}
          </h2>
          <SnapshotKindBadge kind={snapshot.kind} />
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          {formatSnapshotScope(snapshot)} ยท captured{" "}
          <time dateTime={snapshot.createdAt}>
            {formatDateTime(snapshot.createdAt)}
          </time>
        </p>
      </header>

      <p className="no-print rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {FROZEN_SNAPSHOT_DISCLAIMER}
      </p>

      <SnapshotEvidenceExportControls snapshot={snapshot} />

      <div className="sticky top-0 z-20 -mx-1 border border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Matched</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{summary.matchedCount}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Variance rows</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{summary.varianceCount}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Issues</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{allIssues.length}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Total variance</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {formatAmount(summary.totalVarianceAmount)}
            </dd>
          </div>
        </dl>
      </div>

      <CollapsibleSection title="Metadata">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-zinc-500">Label</dt>
            <dd className="mt-1 text-zinc-900">{snapshot.label ?? "โ€”"}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Scope</dt>
            <dd className="mt-1 text-zinc-900">{formatSnapshotScope(snapshot)}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Branch</dt>
            <dd className="mt-1 font-mono text-sm">
              {snapshot.branchId ?? "All branches"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Captured</dt>
            <dd className="mt-1 text-zinc-900">
              {formatDateTime(snapshot.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Checked sales</dt>
            <dd className="mt-1 tabular-nums">{snapshot.checkedSales}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Checked stock documents</dt>
            <dd className="mt-1 tabular-nums">{snapshot.checkedStockDocuments}</dd>
          </div>
        </dl>
        {snapshot.note ? (
          <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            <p className="font-medium text-zinc-800">Note</p>
            <p className="mt-1 whitespace-pre-wrap">{snapshot.note}</p>
          </div>
        ) : null}
      </CollapsibleSection>

      <CollapsibleSection title="Aggregate totals at capture">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded border border-zinc-200 p-4">
            <p className="text-sm font-medium text-zinc-800">Inventory</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Operational</dt>
                <dd className="tabular-nums">{formatAmount(inventoryResult.operationalTotalValue)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">GL balance</dt>
                <dd className="tabular-nums">{formatAmount(inventoryResult.glInventoryBalance)}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded border border-zinc-200 p-4">
            <p className="text-sm font-medium text-zinc-800">Sales / revenue</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Operational revenue</dt>
                <dd className="tabular-nums">{formatAmount(salesResult.operationalRevenue)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">GL revenue</dt>
                <dd className="tabular-nums">{formatAmount(salesResult.glRevenueBalance)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Dashboard summary">
        <div className="no-print grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded border border-zinc-200 p-4">
            <p className="text-sm text-zinc-600">Matched</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {summary.matchedCount}
            </p>
          </div>
          <div className="rounded border border-zinc-200 p-4">
            <p className="text-sm text-zinc-600">Unmatched</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {summary.unmatchedCount}
            </p>
          </div>
          <div className="rounded border border-zinc-200 p-4">
            <p className="text-sm text-zinc-600">Variance rows</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {summary.varianceCount}
            </p>
          </div>
          <div className="rounded border border-zinc-200 p-4">
            <p className="text-sm text-zinc-600">Total variance amount</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatAmount(summary.totalVarianceAmount)}
            </p>
          </div>
        </div>
        <div className="print-only grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded border border-zinc-200 p-4">
            <p className="text-sm text-zinc-600">Matched (full payload)</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {fullSummary.matchedCount}
            </p>
          </div>
          <div className="rounded border border-zinc-200 p-4">
            <p className="text-sm text-zinc-600">Unmatched</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {fullSummary.unmatchedCount}
            </p>
          </div>
          <div className="rounded border border-zinc-200 p-4">
            <p className="text-sm text-zinc-600">Variance rows</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {fullSummary.varianceCount}
            </p>
          </div>
          <div className="rounded border border-zinc-200 p-4">
            <p className="text-sm text-zinc-600">Total variance amount</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatAmount(fullSummary.totalVarianceAmount)}
            </p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Dashboard rows">
        <div className="no-print flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-sm text-zinc-600">
              Category
              <select
                value={filter.domain ?? "all"}
                onChange={(event) =>
                  setFilter({ ...filter, domain: event.target.value })
                }
                className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
              >
                {DOMAIN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-600">
              Status
              <select
                value={filter.status ?? "ALL"}
                onChange={(event) =>
                  setFilter({
                    ...filter,
                    status: event.target.value as ReconciliationRowStatus | "ALL",
                  })
                }
                className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="no-print">
          <ReconciliationDashboardTable
            rows={visibleRows}
            selectedRowId={selectedRow?.id ?? null}
            onSelectRow={setSelectedRow}
          />
        </div>
        <div className="print-only print-break-before">
          <p className="mb-3 text-sm text-zinc-600">
            Full frozen dashboard ({dashboardRows.length} rows)
          </p>
          <ReconciliationDashboardTable rows={dashboardRows} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Transaction issues">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div>
            {selectedRow ? (
              <p className="text-sm text-zinc-600">
                Filtered by category: {selectedRow.domain}. Click another row or
                clear selection to show all frozen issues.
              </p>
            ) : (
              <p className="text-sm text-zinc-600">
                {allIssues.length} issue(s) from frozen payload. Expand an issue to view frozen finance lineage.
              </p>
            )}
            {issuesPagination.total > SNAPSHOT_UI_ISSUES_PAGE_SIZE ? (
              <p className="mt-1 text-xs text-zinc-500">
                Showing {issuesPagination.visible.length} of {issuesPagination.total} issues.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedRow ? (
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900"
              >
                Show all issues
              </button>
            ) : null}
          </div>
        </div>
        <div className="no-print">
          <ReconciliationIssuesTable issues={issuesPagination.visible} snapshotTrace={snapshotTraceContext} />
        </div>
        <div className="print-only print-break-before">
          <p className="mb-3 text-sm text-zinc-600">
            Full frozen issues ({allIssues.length} issues)
          </p>
          <ReconciliationIssuesTable issues={allIssues} snapshotTrace={snapshotTraceContext} />
        </div>
        {issuesPagination.hasMore ? (
          <button
            type="button"
            onClick={() => setIssuesVisibleCount(issuesPagination.nextVisibleCount)}
            className="no-print mt-4 rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900"
          >
            Show more issues ({issuesPagination.total - issuesPagination.visible.length} remaining)
          </button>
        ) : null}
      </CollapsibleSection>
    </div>
  )
}

type ReconciliationSnapshotDetailClientProps = {
  id: string
}

export function ReconciliationSnapshotDetailClient({
  id,
}: ReconciliationSnapshotDetailClientProps) {
  const [snapshot, setSnapshot] = useState<ReconciliationSnapshotDetail | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchReconciliationSnapshotById(id)
        if (!cancelled) {
          setSnapshot(result.snapshot)
        }
      } catch (err) {
        if (!cancelled) {
          setSnapshot(null)
          setError(err instanceof Error ? err.message : "Request failed")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return <SnapshotDetailSkeleton />
  }

  if (error) {
    return (
      <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </p>
    )
  }

  if (!snapshot) {
    return (
      <p className="rounded border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
        Snapshot not found.
      </p>
    )
  }

  return <ReconciliationSnapshotDetailView snapshot={snapshot} />
}

