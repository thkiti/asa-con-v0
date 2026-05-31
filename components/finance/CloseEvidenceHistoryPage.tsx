"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  buildCloseEvidencePath,
  type CloseEvidenceDetail,
} from "@/lib/finance-ui/close-evidence"
import { fetchCloseEvidenceHistory } from "@/lib/finance-ui/period-fetchers"

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

type CloseEvidenceHistoryPageProps = {
  periodId: string
}

export function CloseEvidenceHistoryPage({ periodId }: CloseEvidenceHistoryPageProps) {
  const [rows, setRows] = useState<CloseEvidenceDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchCloseEvidenceHistory(periodId)
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
    return <p className="text-zinc-600">Loading close evidence history…</p>
  }

  if (error) {
    return (
      <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </p>
    )
  }

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-600">No close evidence records for this period.</p>
  }

  return (
    <ul className="divide-y divide-zinc-100 rounded border border-zinc-200">
      {rows.map((row, index) => (
        <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-zinc-900">
              {index === 0 ? "Latest · " : ""}
              {row.closeMode} close · {formatDateTime(row.closedAt)}
            </p>
            <p className="text-xs text-zinc-500">
              {row.closedByName} ({row.closedByRole}) · readiness {row.readinessStatus}
            </p>
          </div>
          <Link
            href={buildCloseEvidencePath(periodId, row.id)}
            className="text-sm font-medium text-zinc-900 underline"
          >
            View record
          </Link>
        </li>
      ))}
    </ul>
  )
}
