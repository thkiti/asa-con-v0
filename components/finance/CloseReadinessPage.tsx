"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { fetchCloseReadiness } from "@/lib/finance-ui/period-fetchers"
import type { CloseReadinessResult } from "@/lib/finance-ui/close-readiness"
import { CloseChecklistPanel } from "./CloseChecklistPanel"
import { CloseReadinessStatusBadge } from "./CloseReadinessStatusBadge"
import { PeriodStatusBadge } from "./PeriodStatusBadge"

type CloseReadinessPageProps = {
  periodId: string
}

export function CloseReadinessPage({ periodId }: CloseReadinessPageProps) {
  const [readiness, setReadiness] = useState<CloseReadinessResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadReadiness = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const result = await fetchCloseReadiness(periodId)
      setReadiness(result.readiness)
    } catch (err) {
      setReadiness(null)
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [periodId])

  useEffect(() => {
    void loadReadiness(false)
  }, [loadReadiness])

  if (loading && !readiness) {
    return <p className="text-zinc-600">Loading close readiness…</p>
  }

  if (error && !readiness) {
    return (
      <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </p>
    )
  }

  if (!readiness) {
    return null
  }

  return (
    <div className="space-y-6">
      <section className="rounded border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Accounting period
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900">
              {readiness.period.periodKey}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Branch {readiness.period.branchId}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodStatusBadge status={readiness.period.status} />
            <CloseReadinessStatusBadge status={readiness.status} />
          </div>
        </div>
        <p className="mt-3 text-sm text-zinc-700">
          Read-only close readiness review. This page does not close the period or
          mutate reconciliation data.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void loadReadiness(true)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-white disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh checklist"}
          </button>
          <Link
            href="/finance/periods"
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-white"
          >
            Back to periods
          </Link>
          <Link
            href="/finance/reconciliation"
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-white"
          >
            Live reconciliation
          </Link>
        </div>
      </section>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <CloseChecklistPanel readiness={readiness} />
    </div>
  )
}