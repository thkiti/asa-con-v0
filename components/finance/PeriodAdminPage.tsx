"use client"

import { useCallback, useEffect, useState } from "react"
import {
  fetchAccountingPeriods,
  fetchReopenRequests,
  fetchSessionDisplay,
  patchAccountingPeriod,
  postAccountingPeriod,
  postReopenRequest,
  type PeriodAction,
} from "@/lib/finance-ui/period-fetchers"
import type { ReopenRequestDetail } from "@/lib/finance-ui/reopen-requests"
import { getPeriodActionErrorDetails } from "@/lib/finance-ui/period-errors"
import type {
  AccountingPeriodRow,
  AccountingPeriodStatus,
  SessionDisplay,
} from "@/lib/finance-ui/types"
import { CloseGateBlockerList } from "./CloseGateBlockerList"
import { PeriodTable } from "./PeriodTable"
import {
  themeBannerError,
  themeBannerSuccess,
  themeBtnSecondary,
  themeInput,
  themeLabel,
  themeLoadingText,
  themeSectionTitle,
  themeSelect,
  themeTextPrimary,
  themeTextSecondary,
} from "@/lib/finance-ui/finance-visual-classes"

const PERIOD_KEY_PATTERN = /^\d{4}-\d{2}$/

const STATUS_FILTER_OPTIONS: Array<"ALL" | AccountingPeriodStatus> = [
  "ALL",
  "OPEN",
  "SOFT_CLOSED",
  "HARD_CLOSED",
]

export function PeriodAdminPage() {
  const [statusFilter, setStatusFilter] = useState<"ALL" | AccountingPeriodStatus>(
    "ALL"
  )
  const [periodKeyFilter, setPeriodKeyFilter] = useState("")
  const [createPeriodKey, setCreatePeriodKey] = useState("")
  const [periods, setPeriods] = useState<AccountingPeriodRow[]>([])
  const [sessionDisplay, setSessionDisplay] = useState<SessionDisplay | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<
    ReturnType<typeof getPeriodActionErrorDetails> & {
      periodId?: string
      branchId?: string
      periodKey?: string
    } | null
  >(null)
  const [pendingPeriodId, setPendingPeriodId] = useState<string | null>(null)
  const [pendingReopenRequests, setPendingReopenRequests] = useState<
    Record<string, ReopenRequestDetail>
  >({})

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
        periodKey?: string
        status?: string
      } = {}

      if (periodKey) {
        filter.periodKey = periodKey
      }
      if (statusFilter !== "ALL") {
        filter.status = statusFilter
      }

      const result = await fetchAccountingPeriods(filter)
      setPeriods(result.periods)

      const hardClosed = result.periods.filter((period) => period.status === "HARD_CLOSED")
      const pendingEntries = await Promise.all(
        hardClosed.map(async (period) => {
          try {
            const pending = await fetchReopenRequests(period.id, { status: "PENDING" })
            const first = pending.requests[0]
            return first ? ([period.id, first] as const) : null
          } catch {
            return null
          }
        })
      )
      const pendingMap: Record<string, ReopenRequestDetail> = {}
      for (const entry of pendingEntries) {
        if (entry) {
          pendingMap[entry[0]] = entry[1]
        }
      }
      setPendingReopenRequests(pendingMap)
    } catch (err) {
      setPeriods([])
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }, [periodKeyFilter, statusFilter])

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

    const periodKey = createPeriodKey.trim()

    if (!PERIOD_KEY_PATTERN.test(periodKey)) {
      setError("Period key must match YYYY-MM")
      return
    }

    setPendingAction(true)
    try {
      const result = await postAccountingPeriod({ periodKey })
      setMessage(`Period ${result.period.periodKey} opened`)
      setCreatePeriodKey("")
      await loadPeriods()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setPendingAction(false)
    }
  }

  async function handleReopenRequest(period: AccountingPeriodRow, reason: string) {
    setMessage(null)
    setError(null)
    setActionError(null)
    setPendingPeriodId(period.id)
    setPendingAction(true)
    try {
      const result = await postReopenRequest({ periodId: period.id, reason })
      setMessage(
        `Reopen request ${result.request.requestNo} submitted for period ${period.periodKey}`
      )
      await loadPeriods()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
      throw err
    } finally {
      setPendingPeriodId(null)
      setPendingAction(false)
    }
  }

  async function handlePeriodAction(
    period: AccountingPeriodRow,
    action: PeriodAction,
    options?: { reason?: string }
  ) {
    setMessage(null)
    setError(null)
    setActionError(null)
    setPendingPeriodId(period.id)
    setPendingAction(true)
    try {
      const result = await patchAccountingPeriod({
        periodKey: period.periodKey,
        action,
        reason: options?.reason,
      })
      setMessage(
        `Period ${result.period.periodKey} is now ${result.period.status}`
      )
      await loadPeriods()
    } catch (err) {
      const details = getPeriodActionErrorDetails(err)
      setError(details.message)
      if (details.blockers?.length || details.code) {
        setActionError({
          ...details,
          periodId: period.id,
          branchId: period.branchId,
          periodKey: period.periodKey,
        })
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
        <p className={`mb-4 text-sm ${themeTextSecondary}`}>
          Signed in as {sessionDisplay.name || "Unknown"} ({sessionDisplay.role})
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className={themeSectionTitle}>Filters</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className={themeLabel}>Status</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "ALL" | AccountingPeriodStatus)
              }
              className={`${themeSelect} mt-1 w-full`}
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
            <span className={themeLabel}>Period key</span>
            <input
              type="text"
              value={periodKeyFilter}
              onChange={(e) => setPeriodKeyFilter(e.target.value)}
              placeholder="YYYY-MM"
              className={`${themeInput} text-sm`}
              disabled={controlsDisabled}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadPeriods()}
              disabled={controlsDisabled}
              className={themeBtnSecondary}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className={themeSectionTitle}>Create / open period</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block sm:col-span-2">
            <span className={themeLabel}>Period key</span>
            <input
              type="text"
              value={createPeriodKey}
              onChange={(e) => setCreatePeriodKey(e.target.value)}
              placeholder="YYYY-MM"
              className={`${themeInput} text-sm`}
              disabled={controlsDisabled}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void handleCreatePeriod()}
              disabled={controlsDisabled}
              className={themeBtnSecondary}
            >
              CREATE / OPEN PERIOD
            </button>
          </div>
        </div>
      </section>

      {message ? <p className={`mt-4 ${themeBannerSuccess}`}>{message}</p> : null}

      {error ? (
        <div className={`mt-4 ${themeBannerError}`}>
          <p>{error}</p>
          {actionError?.blockers?.length ? (
            <div className={`mt-3 ${themeTextPrimary}`}>
              <CloseGateBlockerList
                blockers={actionError.blockers}
                title="Hard close rejected"
                errorCode={actionError.code}
                readinessStatus={actionError.readinessStatus}
                context={{
                  periodId: actionError.periodId,
                  branchId: actionError.branchId,
                  periodKey: actionError.periodKey,
                  latestSnapshotId: actionError.blockers.find(
                    (blocker) => blocker.refs?.snapshotId
                  )?.refs?.snapshotId,
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {loading && periods.length === 0 ? (
        <p className={`mt-4 ${themeLoadingText}`}>Loading periods…</p>
      ) : (
        <PeriodTable
          periods={periods}
          showControls
          sessionRole={sessionDisplay?.role}
          actionsDisabled={controlsDisabled}
          pendingPeriodId={pendingPeriodId}
          pendingReopenRequests={pendingReopenRequests}
          onPeriodAction={handlePeriodAction}
          onReopenRequest={handleReopenRequest}
        />
      )}
    </div>
  )
}
