"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { fetchReconciliationSnapshots } from "@/lib/finance-ui/fetchers"
import { formatAmount, formatDateTime } from "@/lib/finance-ui/format"
import {
  formatSnapshotDisplayTitle,
  formatSnapshotKindLabel,
  formatSnapshotScope,
} from "@/lib/finance-ui/reconciliation-snapshots"
import type { ReconciliationSnapshotHeader } from "@/lib/finance-ui/types"

function SnapshotKindBadge({ kind }: { kind: ReconciliationSnapshotHeader["kind"] }) {
  return (
    <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-700">
      {formatSnapshotKindLabel(kind)}
    </span>
  )
}

function SnapshotSummaryChips({
  snapshot,
}: {
  snapshot: ReconciliationSnapshotHeader
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span className="inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        {snapshot.matchedCount} matched
      </span>
      <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
        {snapshot.varianceCount} variance
      </span>
      <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
        {snapshot.issueCount} issues
      </span>
    </div>
  )
}

function SnapshotListSkeleton() {
  return (
    <div className="overflow-x-auto rounded border border-zinc-200">
      <table className="min-w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-zinc-50">
          <tr className="border-b border-zinc-200 text-left text-zinc-600">
            <th className="px-3 py-2 font-medium w-10">Compare</th>
                <th className="px-3 py-2 font-medium">Label / scope</th>
            <th className="px-3 py-2 font-medium">Branch</th>
            <th className="px-3 py-2 font-medium">Captured</th>
            <th className="px-3 py-2 font-medium text-right">Summary</th>
            <th className="px-3 py-2 font-medium text-right">Variance</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, index) => (
            <tr key={index} className="border-b border-zinc-100">
              <td className="px-3 py-3" colSpan={6}>
                <div className="h-4 animate-pulse rounded bg-zinc-200" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ReconciliationSnapshotsPage() {
  const [branchFilter, setBranchFilter] = useState("")
  const [appliedBranchId, setAppliedBranchId] = useState<string | undefined>()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [snapshots, setSnapshots] = useState<ReconciliationSnapshotHeader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSnapshots = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchReconciliationSnapshots({
        branchId: appliedBranchId,
      })
      setSnapshots(result.snapshots)
    } catch (err) {
      setSnapshots([])
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }, [appliedBranchId])

  useEffect(() => {
    void loadSnapshots()
  }, [loadSnapshots])

  function toggleSnapshotSelection(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((value) => value !== id)
      }
      if (current.length >= 2) {
        return [current[1], id]
      }
      return [...current, id]
    })
  }

  function handleApplyBranchFilter(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = branchFilter.trim()
    setAppliedBranchId(trimmed || undefined)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-zinc-600">
          Read-only frozen reconciliation captures. No live refresh of underlying
          data.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length === 2 ? (
            <Link
              href={`/finance/reconciliation/snapshots/compare?left=${selectedIds[0]}&right=${selectedIds[1]}`}
              className="rounded border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              Compare selected
            </Link>
          ) : (
            <span className="text-xs text-zinc-500">Select two snapshots to compare</span>
          )}
          <Link
            href="/finance/reconciliation/snapshots/compare"
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900"
          >
            Open compare
          </Link>
          <button
            type="button"
            onClick={() => void loadSnapshots()}
            disabled={loading}
            className="shrink-0 rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 disabled:opacity-50"
          >
            {loading ? "Refreshing�" : "Refresh"}
          </button>
        </div>      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={handleApplyBranchFilter}
      >
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm text-zinc-600 sm:max-w-xs">
          Branch filter
          <input
            type="text"
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
            placeholder="Optional branch ID"
            className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
        >
          Apply filter
        </button>
        {appliedBranchId ? (
          <button
            type="button"
            onClick={() => {
              setBranchFilter("")
              setAppliedBranchId(undefined)
            }}
            className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600"
          >
            Clear
          </button>
        ) : null}
      </form>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading && snapshots.length === 0 ? <SnapshotListSkeleton /> : null}

      {!loading && !error && snapshots.length === 0 ? (
        <div className="rounded border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
          <p className="font-medium text-zinc-800">No reconciliation snapshots yet</p>
          <p className="mt-2">
            Capture a frozen snapshot from the live reconciliation dashboard after
            applying a valid scope.
          </p>
          <Link
            href="/finance/reconciliation"
            className="mt-4 inline-block text-zinc-900 underline decoration-zinc-300 hover:decoration-zinc-600"
          >
            Open reconciliation dashboard
          </Link>
        </div>
      ) : null}

      {!loading && snapshots.length > 0 ? (
        <div className="overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-50 shadow-sm">
              <tr className="border-b border-zinc-200 text-left text-zinc-600">
                <th className="px-3 py-2 font-medium w-10">Compare</th>
                <th className="px-3 py-2 font-medium">Label / scope</th>
                <th className="px-3 py-2 font-medium">Branch</th>
                <th className="px-3 py-2 font-medium">Captured</th>
                <th className="px-3 py-2 font-medium text-right">Summary</th>
                <th className="px-3 py-2 font-medium text-right">Variance</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((snapshot) => (
                <tr
                  key={snapshot.id}
                  className="border-b border-zinc-100 hover:bg-zinc-50"
                >
                  <td className="px-3 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(snapshot.id)}
                      onChange={() => toggleSnapshotSelection(snapshot.id)}
                      aria-label={`Select ${formatSnapshotDisplayTitle(snapshot)} for compare`}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/finance/reconciliation/snapshots/${snapshot.id}`}
                        className="font-medium text-zinc-900 underline decoration-zinc-300 hover:decoration-zinc-600"
                      >
                        {formatSnapshotDisplayTitle(snapshot)}
                      </Link>
                      <SnapshotKindBadge kind={snapshot.kind} />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatSnapshotScope(snapshot)}
                    </p>
                    <SnapshotSummaryChips snapshot={snapshot} />
                  </td>
                  <td className="px-3 py-3 align-top">
                    {snapshot.branchId ? (
                      <span
                        className="inline-block max-w-[10rem] truncate font-mono text-xs text-zinc-800 sm:max-w-none"
                        title={snapshot.branchId}
                      >
                        {snapshot.branchId}
                      </span>
                    ) : (
                      <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        All branches
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top text-zinc-600">
                    <time dateTime={snapshot.createdAt}>
                      {formatDateTime(snapshot.createdAt)}
                    </time>
                  </td>
                  <td className="px-3 py-3 align-top text-right tabular-nums text-zinc-700">
                    {snapshot.dashboardRowCount} rows
                  </td>
                  <td className="px-3 py-3 align-top text-right tabular-nums font-medium text-zinc-900">
                    {formatAmount(snapshot.totalVarianceAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
