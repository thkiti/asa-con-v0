"use client"

import { useEffect, useMemo, useState } from "react"
import { fetchReconciliationSnapshotById } from "@/lib/finance-ui/fetchers"
import { formatAmount } from "@/lib/finance-ui/format"
import {
  filterDashboardRows,
  summarizeDashboardRows,
  type ReconciliationDashboardFilter,
  type ReconciliationDashboardRow,
} from "@/lib/finance-ui/reconciliation"
import {
  exportFrozenDashboardCsv,
  exportFrozenIssuesCsv,
  filterFrozenIssuesByDomain,
  snapshotIssuesToUiRows,
  snapshotRowsToDashboardRows,
} from "@/lib/finance-ui/reconciliation-snapshots"
import type {
  ReconciliationIssueRow,
  ReconciliationSnapshotDetail,
} from "@/lib/finance-ui/types"
import { ReconciliationDashboardTable } from "./ReconciliationDashboardTable"
import { ReconciliationIssuesTable } from "./ReconciliationIssuesTable"

type ReconciliationSnapshotDetailViewProps = {
  snapshot: ReconciliationSnapshotDetail
}

function formatScope(snapshot: ReconciliationSnapshotDetail): string {
  if (snapshot.periodKey) {
    return snapshot.periodKey
  }
  if (snapshot.fromDate && snapshot.toDate) {
    return `${snapshot.fromDate.slice(0, 10)} → ${snapshot.toDate.slice(0, 10)}`
  }
  return "All dates"
}

export function ReconciliationSnapshotDetailView({
  snapshot,
}: ReconciliationSnapshotDetailViewProps) {
  const [selectedRow, setSelectedRow] =
    useState<ReconciliationDashboardRow | null>(null)
  const [filter] = useState<ReconciliationDashboardFilter>({
    domain: "all",
    status: "ALL",
  })

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

  const visibleIssues = useMemo<ReconciliationIssueRow[]>(() => {
    if (!selectedRow) {
      return allIssues
    }
    return filterFrozenIssuesByDomain(allIssues, selectedRow.domain)
  }, [allIssues, selectedRow])

  return (
    <div>
      <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Frozen snapshot — data from capture time only (no live fetch).
      </p>

      <section aria-label="Snapshot metadata" className="mt-6">
        <h2 className="text-base font-semibold">Metadata</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-zinc-500">Label</dt>
            <dd className="mt-1 text-zinc-900">{snapshot.label ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Scope</dt>
            <dd className="mt-1 text-zinc-900">{formatScope(snapshot)}</dd>
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
              {new Date(snapshot.createdAt).toLocaleString()}
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
      </section>

      <section aria-label="Summary" className="mt-8">
        <h2 className="text-base font-semibold">Summary</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      </section>

      <section aria-label="Frozen dashboard rows" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Dashboard rows</h2>
          <button
            type="button"
            disabled={visibleRows.length === 0}
            onClick={() => exportFrozenDashboardCsv(visibleRows)}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
          >
            Export dashboard CSV
          </button>
        </div>
        <ReconciliationDashboardTable
          rows={visibleRows}
          onSelectRow={setSelectedRow}
        />
      </section>

      <section aria-label="Frozen transaction issues" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Transaction issues</h2>
            {selectedRow ? (
              <p className="mt-1 text-sm text-zinc-600">
                Filtered by category: {selectedRow.domain}. Click another row or
                clear selection to show all frozen issues.
              </p>
            ) : (
              <p className="mt-1 text-sm text-zinc-600">
                {allIssues.length} issue(s) from frozen payload.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedRow ? (
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900"
              >
                Show all issues
              </button>
            ) : null}
            <button
              type="button"
              disabled={visibleIssues.length === 0}
              onClick={() => exportFrozenIssuesCsv(visibleIssues)}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
            >
              Export issues CSV
            </button>
          </div>
        </div>
        <ReconciliationIssuesTable issues={visibleIssues} />
      </section>
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
    return <p className="text-zinc-600">Loading snapshot…</p>
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
