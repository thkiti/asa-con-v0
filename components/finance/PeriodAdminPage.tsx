"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchAccountingPeriods, fetchSessionDisplay } from "@/lib/finance-ui/period-fetchers"
import type {
  AccountingPeriodRow,
  AccountingPeriodStatus,
  SessionDisplay,
} from "@/lib/finance-ui/types"
import { PeriodTable } from "./PeriodTable"
import {
  themeBannerError,
  themeInput,
  themeLabel,
  themeLoadingText,
  themeSectionTitle,
  themeTextSecondary,
  themeBtnSecondary,
  voucherInquiryFilterActions,
  voucherInquiryFilterBar,
  voucherInquiryFilterButtonSecondary,
  voucherInquiryFilterField,
  voucherInquiryFilterSelect,
} from "@/lib/finance-ui/finance-visual-classes"

const PERIOD_KEY_PATTERN = /^\d{4}-\d{2}$/

const STATUS_FILTER_OPTIONS: AccountingPeriodStatus[] = [
  "OPEN",
  "SOFT_CLOSED",
  "HARD_CLOSED",
]

type PeriodAdminPageProps = {
  /** When true, shows manual create/open period controls (bootstrap/repair only). */
  manualPeriodCreationEnabled?: boolean
}

export function PeriodAdminPage({
  manualPeriodCreationEnabled = false,
}: PeriodAdminPageProps) {
  const [statusFilter, setStatusFilter] = useState<"" | AccountingPeriodStatus>("")
  const [periodKeyFilter, setPeriodKeyFilter] = useState("")
  const [periodKeyOptions, setPeriodKeyOptions] = useState<string[]>([])
  const [createPeriodKey, setCreatePeriodKey] = useState("")
  const [periods, setPeriods] = useState<AccountingPeriodRow[]>([])
  const [sessionDisplay, setSessionDisplay] = useState<SessionDisplay | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadPeriodKeyOptions = useCallback(async () => {
    try {
      const result = await fetchAccountingPeriods({})
      const seen = new Set<string>()
      const keys: string[] = []
      for (const period of result.periods) {
        if (!seen.has(period.periodKey)) {
          seen.add(period.periodKey)
          keys.push(period.periodKey)
        }
      }
      setPeriodKeyOptions(keys)
    } catch {
      setPeriodKeyOptions([])
    }
  }, [])

  const loadPeriods = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const periodKey = periodKeyFilter.trim()

      const filter: {
        periodKey?: string
        status?: string
      } = {}

      if (periodKey) {
        filter.periodKey = periodKey
      }
      if (statusFilter) {
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
  }, [periodKeyFilter, statusFilter])

  useEffect(() => {
    void loadPeriodKeyOptions()
  }, [loadPeriodKeyOptions])

  useEffect(() => {
    void loadPeriods()
  }, [loadPeriods])

  async function handleRefresh() {
    await Promise.all([loadPeriodKeyOptions(), loadPeriods()])
  }

  useEffect(() => {
    void fetchSessionDisplay().then(setSessionDisplay)
  }, [])

  async function handleCreatePeriod() {
    if (!manualPeriodCreationEnabled) return

    setMessage(null)
    setError(null)

    const periodKey = createPeriodKey.trim()

    if (!PERIOD_KEY_PATTERN.test(periodKey)) {
      setError("Period key must match YYYY-MM")
      return
    }

    setPendingAction(true)
    try {
      const { postAccountingPeriod } = await import("@/lib/finance-ui/period-fetchers")
      const result = await postAccountingPeriod({ periodKey })
      setMessage(`Period ${result.period.periodKey} opened`)
      setCreatePeriodKey("")
      await Promise.all([loadPeriodKeyOptions(), loadPeriods()])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setPendingAction(false)
    }
  }

  const controlsDisabled = loading || pendingAction

  return (
    <div className="w-full">
      {sessionDisplay ? (
        <p className={`mb-4 text-sm ${themeTextSecondary}`}>
          Signed in as {sessionDisplay.name || "Unknown"} ({sessionDisplay.role})
        </p>
      ) : null}

      <section className="w-full">
        <div className={voucherInquiryFilterBar}>
          <label className={`${voucherInquiryFilterField} w-[180px] shrink-0`}>
            <span className={themeLabel}>Status</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "" | AccountingPeriodStatus)
              }
              className={voucherInquiryFilterSelect}
              disabled={controlsDisabled}
            >
              <option value="">Select status</option>
              {STATUS_FILTER_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className={`${voucherInquiryFilterField} w-[120px] shrink-0`}>
            <span className={themeLabel}>Period</span>
            <select
              value={periodKeyFilter}
              onChange={(e) => setPeriodKeyFilter(e.target.value)}
              className={voucherInquiryFilterSelect}
              disabled={controlsDisabled}
            >
              <option value="">Select period</option>
              {periodKeyOptions.map((periodKey) => (
                <option key={periodKey} value={periodKey}>
                  {periodKey}
                </option>
              ))}
            </select>
          </label>
          <div className={voucherInquiryFilterActions}>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={controlsDisabled}
              className={voucherInquiryFilterButtonSecondary}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      {manualPeriodCreationEnabled ? (
        <section className="mt-8 space-y-4">
          <h2 className={themeSectionTitle}>Create / open period (admin only)</h2>
          <p className={`text-sm ${themeTextSecondary}`}>
            Manual period creation is enabled for bootstrap, repair, migration, or emergency
            admin use only.
          </p>
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
      ) : null}

      {message ? (
        <p className="mt-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading && periods.length === 0 ? (
        <p className={`mt-4 ${themeLoadingText}`}>Loading periods…</p>
      ) : (
        <PeriodTable periods={periods} className="mt-4" />
      )}
    </div>
  )
}
