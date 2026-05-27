"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { fetchReconciliationSnapshots } from "@/lib/finance-ui/fetchers"
import { formatAmount } from "@/lib/finance-ui/format"
import type { ReconciliationSnapshotHeader } from "@/lib/finance-ui/types"

function formatScope(snapshot: ReconciliationSnapshotHeader): string {
  if (snapshot.periodKey) {
    return snapshot.periodKey
  }
  if (snapshot.fromDate && snapshot.toDate) {
    return `${snapshot.fromDate.slice(0, 10)} → ${snapshot.toDate.slice(0, 10)}`
  }
  return "All dates"
}

export function ReconciliationSnapshotsPage() {
  const [snapshots, setSnapshots] = useState<ReconciliationSnapshotHeader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSnapshots = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchReconciliationSnapshots()
      setSnapshots(result.snapshots)
    } catch (err) {
      setSnapshots([])
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSnapshots()
  }, [loadSnapshots])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          Read-only frozen reconciliation captures. No live refresh of underlying
          data.
        </p>
        <button
          type="button"
          onClick={() => void loadSnapshots()}
          disabled={loading}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading && snapshots.length === 0 ? (
        <p className="mt-4 text-zinc-600">Loading snapshots…</p>
      ) : null}

      {!loading && !error && snapshots.length === 0 ? (
        <p className="mt-4 rounded border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
          No reconciliation snapshots yet. Capture one from the reconciliation
          dashboard.
        </p>
      ) : null}

      {snapshots.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-zinc-50">
              <tr className="border-b border-zinc-200 text-left text-zinc-600">
                <th className="px-3 py-2 font-medium">Label / scope</th>
                <th className="px-3 py-2 font-medium">Branch</th>
                <th className="px-3 py-2 font-medium">Captured</th>
                <th className="px-3 py-2 font-medium text-right">Issues</th>
                <th className="px-3 py-2 font-medium text-right">Variance</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((snapshot) => (
                <tr
                  key={snapshot.id}
                  className="border-b border-zinc-100 hover:bg-zinc-50"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/finance/reconciliation/snapshots/${snapshot.id}`}
                      className="font-medium text-zinc-900 underline decoration-zinc-300 hover:decoration-zinc-600"
                    >
                      {snapshot.label?.trim() || formatScope(snapshot)}
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">{formatScope(snapshot)}</p>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {snapshot.branchId ?? "All branches"}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">
                    {new Date(snapshot.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {snapshot.issueCount}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
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
