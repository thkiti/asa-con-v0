"use client"

import { useCallback, useEffect, useState } from "react"
import {
  fetchAccountingPeriods,
  fetchSessionDisplay,
} from "@/lib/finance-ui/period-fetchers"
import type { AccountingPeriodRow, SessionDisplay } from "@/lib/finance-ui/types"
import { PeriodTable } from "./PeriodTable"

export function PeriodsAdminView() {
  const [branchId, setBranchId] = useState("")
  const [periods, setPeriods] = useState<AccountingPeriodRow[]>([])
  const [sessionDisplay, setSessionDisplay] = useState<SessionDisplay | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPeriods = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filter = branchId.trim() ? { branchId: branchId.trim() } : undefined
      const result = await fetchAccountingPeriods(filter)
      setPeriods(result.periods)
    } catch (err) {
      setPeriods([])
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    void loadPeriods()
  }, [loadPeriods])

  useEffect(() => {
    void fetchSessionDisplay().then(setSessionDisplay)
  }, [])

  return (
    <div>
      {sessionDisplay ? (
        <p className="mb-4 text-sm text-zinc-600">
          Signed in as {sessionDisplay.name || "Unknown"} ({sessionDisplay.role})
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="text-sm text-zinc-600">Branch ID filter</span>
          <input
            type="text"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            placeholder="Optional"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void loadPeriods()}
            disabled={loading}
            className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading && periods.length === 0 ? (
        <p className="mt-4 text-zinc-600">Loading periods…</p>
      ) : (
        <PeriodTable
          periods={periods}
          showControls
          onStatusChange={() => void loadPeriods()}
        />
      )}
    </div>
  )
}
