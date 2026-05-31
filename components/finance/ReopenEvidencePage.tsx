"use client"

import { useCallback, useEffect, useState } from "react"
import type { ReopenEvidenceDetail } from "@/lib/finance-ui/reopen-evidence"
import { fetchReopenEvidence } from "@/lib/finance-ui/period-fetchers"

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

type ReopenEvidencePageProps = {
  periodId: string
}

export function ReopenEvidencePage({ periodId }: ReopenEvidencePageProps) {
  const [rows, setRows] = useState<ReopenEvidenceDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchReopenEvidence(periodId)
      setRows(result.evidence)
    } catch (err) {
      setRows([])
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }, [periodId])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  if (loading) {
    return <p className="text-zinc-600">Loading reopen evidence…</p>
  }

  if (error) {
    return (
      <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </p>
    )
  }

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-600">No reopen events recorded for this period.</p>
  }

  return (
    <ul className="divide-y divide-zinc-100 rounded border border-zinc-200">
      {rows.map((row) => (
        <li key={row.id} className="px-4 py-3">
          <p className="text-sm font-medium text-zinc-900">
            {row.fromStatus} → {row.toStatus} · {formatDateTime(row.reopenedAt)}
          </p>
          <p className="mt-1 text-sm text-zinc-700">{row.reason}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {row.reopenedByName} ({row.reopenedByRole})
            {row.closeEvidenceId ? ` · close evidence ${row.closeEvidenceId}` : ""}
          </p>
        </li>
      ))}
    </ul>
  )
}
