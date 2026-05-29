"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  fetchAccountingPeriods,
  fetchSessionDisplay,
  patchAccountingPeriod,
  postAccountingPeriod,
  type PeriodAction,
} from "@/lib/finance-ui/period-fetchers"
import { getPeriodActionErrorDetails } from "@/lib/finance-ui/period-errors"
import type {
  AccountingPeriodRow,
  AccountingPeriodStatus,
  SessionDisplay,
} from "@/lib/finance-ui/types"
import { CloseGateBlockerList } from "./CloseGateBlockerList"
import { PeriodTable } from "./PeriodTable"

const PERIOD_KEY_PATTERN = /^\d{4}-\d{2}$/

const STATUS_FILTER_OPTIONS: Array<"ALL" | AccountingPeriodStatus> = [
  "ALL",
  "OPEN",
  "SOFT_CLOSED",
  "HARD_CLOSED",
]

export function PeriodAdminPage() {
  const [branchFilter, setBranchFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState<"ALL" | AccountingPeriodStatus>(
    "ALL"
  )
  const [periodKeyFilter, setPeriodKeyFilter] = useState("")
  const [createBranchId, setCreateBranchId] = useState("")
  const [createPeriodKey, setCreatePeriodKey] = useState("")
  const [periods, setPeriods] = useState<AccountingPeriodRow[]>([])
  const [sessionDisplay, setSessionDisplay] = useState<SessionDisplay | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<ReturnType<
    typeof getPeriodActionErrorDetails
  > | null>(null)
  const [pendingPeriodId, setPendingPeriodId] = useState<string | null>(null)

  const branchOptions = useMemo(() => {
    const ids = [...new Set(periods.map((period) => period.branchId))].sort()
    return ids
  }, [periods])

  const loadPeriods = useCallback(async () => {
    setLoading(true)
    setError(null)
    setActionError(null)
    try {
      const periodKey = periodKeyFilter.trim()
      if (periodKey && !PERIOD_KEY_PATTERN.test(periodKey)) {
        throw new Error("Period key must match YYYY-MM")
      }

      const filter: {
        branchId?: string
        periodKey?: string
        status?: string
      } = {}

      if (branchFilter !== "ALL") {
        filter.branchId = branchFilter
      }
      if (periodKey) {
        filter.periodKey = periodKey
      }
      if (statusFilter !== "ALL") {
        filter.status = statusFilter
      }

      const result = await fetchAccountingPeriods(filter)
      setPeriods(result.periods)
    } catch (err) {
      setPeriods([])
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }, [branchFilter, periodKeyFilter, statusFilter])

  useEffect(() => {
    void loadPeriods()
  }, [loadPeriods])

  useEffect(() => {
    void fetchSessionDisplay().then(setSessionDisplay)
  }, [])

  async function handleCreatePeriod() {
    setMessage(null)
    setError(null)
    setActionError(null)

    const branchId = createBranchId.trim()
    const periodKey = createPeriodKey.trim()

    if (!branchId) {
      setError("Branch ID is required to create a period")
      return
    }
    if (!PERIOD_KEY_PATTERN.test(periodKey)) {
      setError("Period key must match YYYY-MM")
      return
    }

    setPendingAction(true)
    try {
      const result = await postAccountingPeriod({ branchId, periodKey })
      setMessage(
        `Period ${result.period.periodKey} opened for branch ${result.period.branchId}`
      )
      setCreateBranchId("")
      setCreatePeriodKey("")
      await loadPeriods()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setPendingAction(false)
    }
  }

  async function handlePeriodAction(
    period: AccountingPeriodRow,
    action: PeriodAction
  ) {
    setMessage(null)
    setError(null)
    setActionError(null)
    setPendingPeriodId(period.id)
    setPendingAction(true)
    try {
      const result = await patchAccountingPeriod({
        branchId: period.branchId,
        periodKey: period.periodKey,
        action,
      })
      setMessage(
        `Period ${result.period.periodKey} is now ${result.period.status}`
      )
      await loadPeriods()
    } catch (err) {
      const details = getPeriodActionErrorDetails(err)
      setError(details.message)
      if (details.blockers?.length) {
        setActionError(details)
      }
      throw err
    } finally {
      setPendingPeriodId(null)
      setPendingAction(false)
    }
  }

  const controlsDisabled = loading || pendingAction

  return (
    <div>
      {sessionDisplay ? (
        <p className="mb-4 text-sm text-zinc-600">
          Signed in as {sessionDisplay.name || "Unknown"} ({sessionDisplay.role})
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-zinc-900">Filters</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-sm text-zinc-600">Branch</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              disabled={controlsDisabled}
            >
              <option value="ALL">ALL</option>
              {branchOptions.map((branchId) => (
                <option key={branchId} value={branchId}>
                  {branchId}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-zinc-600">Status</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "ALL" | AccountingPeriodStatus)
              }
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              disabled={controlsDisabled}
            >
              {STATUS_FILTER_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-zinc-600">Period key</span>
            <input
              type="text"
              value={periodKeyFilter}
              onChange={(e) => setPeriodKeyFilter(e.target.value)}
              placeholder="YYYY-MM"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              disabled={controlsDisabled}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadPeriods()}
              disabled={controlsDisabled}
              className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-sm font-medium text-zinc-900">Create / open period</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="text-sm text-zinc-600">Branch ID</span>
            <input
              type="text"
              value={createBranchId}
              onChange={(e) => setCreateBranchId(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              disabled={controlsDisabled}
            />
          </label>
          <label className="block">
            <span className="text-sm text-zinc-600">Period key</span>
            <input
              type="text"
              value={createPeriodKey}
              onChange={(e) => setCreatePeriodKey(e.target.value)}
              placeholder="YYYY-MM"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              disabled={controlsDisabled}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void handleCreatePeriod()}
              disabled={controlsDisabled}
              className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              CREATE / OPEN PERIOD
            </button>
          </div>
        </div>
      </section>

      {message ? (
        <p className="mt-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </p>
      ) : null}

      {error ? (
        <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{error}</p>
          {actionError?.blockers?.length ? (
            <div className="mt-3 text-zinc-900">
              <CloseGateBlockerList blockers={actionError.blockers} compact />
            </div>
          ) : null}
        </div>
      ) : null}

      {loading && periods.length === 0 ? (
        <p className="mt-4 text-zinc-600">Loading periods…</p>
      ) : (
        <PeriodTable
          periods={periods}
          showControls
          actionsDisabled={controlsDisabled}
          pendingPeriodId={pendingPeriodId}
          onPeriodAction={handlePeriodAction}
        />
      )}
    </div>
  )
}
