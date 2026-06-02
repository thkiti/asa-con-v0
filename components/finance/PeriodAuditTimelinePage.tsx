"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { buildCloseEvidencePath } from "@/lib/finance-ui/close-evidence"
import type { PeriodAuditTimelineApiResult } from "@/lib/finance-ui/period-audit-timeline"
import { fetchPeriodAuditTimeline } from "@/lib/finance-ui/period-fetchers"

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

type PeriodAuditTimelinePageProps = {
  periodId: string
}

export function PeriodAuditTimelinePage({ periodId }: PeriodAuditTimelinePageProps) {
  const [data, setData] = useState<PeriodAuditTimelineApiResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTimeline = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchPeriodAuditTimeline(periodId)
      setData(result)
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }, [periodId])

  useEffect(() => {
    void loadTimeline()
  }, [loadTimeline])

  const showCloseEvidence = data?.period.status === "HARD_CLOSED"

  return (
    <>
      <Link
        href="/finance/periods"
        className="text-sm text-zinc-600 hover:text-zinc-900"
      >
        &larr; Accounting periods
      </Link>
      {showCloseEvidence ? (
        <Link
          href={buildCloseEvidencePath(periodId)}
          className="ml-4 text-sm text-zinc-600 hover:text-zinc-900"
        >
          Close evidence
        </Link>
      ) : null}
      <h1 className="mt-4 text-xl font-semibold">Period audit timeline</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Read-only chronological view of period lifecycle, close evidence, reopen workflow, and reopen execution.
      </p>

      {loading ? (
        <p className="mt-6 text-zinc-600">Loading audit timeline...</p>
      ) : null}

      {error ? (
        <p className="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {!loading && !error && data && data.timeline.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600">No audit events for this period.</p>
      ) : null}

      {!loading && !error && data && data.timeline.length > 0 ? (
        <div className="mt-6">
          <p className="mb-4 text-sm text-zinc-600">
            Period {data.period.periodKey} - {data.period.status}
          </p>
          <ul className="divide-y divide-zinc-100 rounded border border-zinc-200">
            {data.timeline.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <p className="text-sm font-medium text-zinc-900">
                  {item.title}
                  <span className="ml-2 font-normal text-zinc-500">
                    {formatDateTime(item.occurredAt)}
                  </span>
                </p>
                <p className="mt-1 text-xs text-zinc-500">{item.type}</p>
                <p className="mt-1 text-sm text-zinc-700">{item.description}</p>
                {item.actorName ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.actorName}
                    {item.actorId ? ` (${item.actorId})` : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  )
}
