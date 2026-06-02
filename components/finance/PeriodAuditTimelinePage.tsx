"use client"

import { useCallback, useEffect, useState } from "react"
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

  if (loading) {
    return <p className="text-zinc-600">Loading audit timeline�</p>
  }

  if (error) {
    return (
      <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </p>
    )
  }

  if (!data || data.timeline.length === 0) {
    return <p className="text-sm text-zinc-600">No audit events for this period.</p>
  }

  return (
    <div>
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
  )
}
