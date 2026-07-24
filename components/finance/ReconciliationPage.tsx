"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AccountingPeriodSelect } from "@/components/finance/AccountingPeriodSelect"
import { useAccountingPeriodOptions } from "@/lib/finance-ui/use-accounting-period-options"
import {
  createReconciliationSnapshot,
  fetchReconciliationDashboard,
  fetchReconciliationIssues,
} from "@/lib/finance-ui/fetchers"
import { formatAmount } from "@/lib/finance-ui/format"
import {
  buildApiFilter,
  filterDashboardRows,
  formatPeriodLabel,
  rowsToCsv,
  summarizeDashboardRows,
  toDashboardRows,
  type ReconciliationDashboardFilter,
  type ReconciliationDashboardRow,
  type ReconciliationRowStatus,
  varianceRowsFromResults,
} from "@/lib/finance-ui/reconciliation"
import {
  buildSnapshotCaptureBody,
  canCaptureSnapshotScope,
} from "@/lib/finance-ui/reconciliation-snapshots"
import type { ReconciliationIssueRow } from "@/lib/finance-ui/types"
import { ReconciliationDashboardTable } from "./ReconciliationDashboardTable"
import { VarianceDetailPanel } from "./VarianceDetailPanel"

const STATUS_OPTIONS: Array<ReconciliationRowStatus | "ALL"> = [
  "ALL",
  "MATCHED",
  "VARIANCE",
  "MISSING_SOURCE",
  "MISSING_GL",
]

const DOMAIN_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "inventory", label: "Inventory" },
  { value: "revenue", label: "Revenue" },
  { value: "tender", label: "Tender" },
  { value: "refund", label: "Refunds" },
]

type ReconciliationPageProps = {
  initialBranchId?: string
  initialPeriodKey?: string
}

export function ReconciliationPage({
  initialBranchId,
  initialPeriodKey,
}: ReconciliationPageProps = {}) {
  const { periods, loading: periodsLoading } = useAccountingPeriodOptions()
  const [filter, setFilter] = useState<ReconciliationDashboardFilter>({
    status: "ALL",
    domain: "all",
    ...(initialBranchId?.trim() ? { branchId: initialBranchId.trim() } : {}),
    ...(initialPeriodKey?.trim() ? { periodKey: initialPeriodKey.trim() } : {}),
  })
  const [allRows, setAllRows] = useState<ReconciliationDashboardRow[]>([])
  const [appliedFilter, setAppliedFilter] = useState<ReconciliationDashboardFilter>(
    {}
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [selectedRow, setSelectedRow] =
    useState<ReconciliationDashboardRow | null>(null)
  const [issues, setIssues] = useState<ReconciliationIssueRow[]>([])
  const [issuesLoading, setIssuesLoading] = useState(false)
  const [issuesError, setIssuesError] = useState<string | null>(null)
  const [captureLabel, setCaptureLabel] = useState("")
  const [captureLoading, setCaptureLoading] = useState(false)
  const [captureMessage, setCaptureMessage] = useState<string | null>(null)
  const [captureError, setCaptureError] = useState<string | null>(null)

  const visibleRows = useMemo(
    () => filterDashboardRows(allRows, filter),
    [allRows, filter]
  )

  const summary = useMemo(
    () => summarizeDashboardRows(visibleRows),
    [visibleRows]
  )

  useEffect(() => {
    if (!selectedRow) {
      setIssues([])
      setIssuesError(null)
      setIssuesLoading(false)
      return
    }

    const row = selectedRow
    let cancelled = false

    async function loadIssues() {
      setIssuesLoading(true)
      setIssuesError(null)
      try {
        const apiFilter = buildApiFilter(appliedFilter)
        const result = await fetchReconciliationIssues({
          ...apiFilter,
          domain: row.domain,
        })
        if (!cancelled) {
          setIssues(result.issues)
        }
      } catch (err) {
        if (!cancelled) {
          setIssues([])
          setIssuesError(err instanceof Error ? err.message : "Request failed")
        }
      } finally {
        if (!cancelled) {
          setIssuesLoading(false)
        }
      }
    }

    void loadIssues()
    return () => {
      cancelled = true
    }
  }, [selectedRow, appliedFilter])

  async function handleApply() {
    setLoading(true)
    setError(null)
    setSelectedRow(null)
    setIssues([])
    setIssuesError(null)
    try {
      const result = await fetchReconciliationDashboard(filter)
      const apiFilter = {
        branchId: filter.branchId,
        from: filter.from,
        to: filter.to,
      }
      const periodLabel = formatPeriodLabel({
        ...apiFilter,
        ...(filter.periodKey
          ? {
              from: filter.periodKey,
              to: undefined,
            }
          : {}),
      })
      const periodDisplay = filter.periodKey?.trim()
        ? filter.periodKey.trim()
        : periodLabel

      const merged = varianceRowsFromResults(result)
      const rows = toDashboardRows({
        rows: merged,
        branchId: filter.branchId,
        periodLabel: periodDisplay,
      })

      setAllRows(rows)
      setAppliedFilter({ ...filter })
      setHasLoaded(true)
    } catch (err) {
      setAllRows([])
      setHasLoaded(true)
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }

  function handleExportCsv() {
    if (visibleRows.length === 0) {
      return
    }
    const csv = rowsToCsv(visibleRows)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "reconciliation.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function handleCaptureSnapshot() {
    setCaptureLoading(true)
    setCaptureMessage(null)
    setCaptureError(null)
    try {
      const body = buildSnapshotCaptureBody(appliedFilter, {
        label: captureLabel,
      })
      const result = await createReconciliationSnapshot(body)
      setCaptureMessage(
        `Snapshot captured (${result.snapshot.id.slice(0, 8)}…).`
      )
      setCaptureLabel("")
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setCaptureLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Link
          href="/finance/reconciliation/snapshots"
          className="text-sm text-zinc-900 underline hover:text-zinc-600"
        >
          View reconciliation snapshots
        </Link>
      </div>
      <section aria-label="Filters">
        <h2 className="text-base font-semibold">Filters</h2>
        <form
          className="mt-3 flex flex-wrap items-end gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleApply()
          }}
        >
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            Branch ID
            <input
              type="text"
              value={filter.branchId ?? ""}
              onChange={(event) =>
                setFilter({ ...filter, branchId: event.target.value })
              }
              className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
              placeholder="Optional"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            Period key
            <AccountingPeriodSelect
              periods={periods}
              value={filter.periodKey?.trim() || null}
              onChange={(value) => setFilter({ ...filter, periodKey: value })}
              loading={periodsLoading}
              showEmptyHint={false}
              className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            From
            <input
              type="date"
              value={filter.from ?? ""}
              onChange={(event) =>
                setFilter({ ...filter, from: event.target.value })
              }
              className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            To
            <input
              type="date"
              value={filter.to ?? ""}
              onChange={(event) =>
                setFilter({ ...filter, to: event.target.value })
              }
              className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            Category
            <select
              value={filter.domain ?? "all"}
              onChange={(event) =>
                setFilter({ ...filter, domain: event.target.value })
              }
              className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
            >
              {DOMAIN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600">
            Variance status
            <select
              value={filter.status ?? "ALL"}
              onChange={(event) =>
                setFilter({
                  ...filter,
                  status: event.target.value as ReconciliationRowStatus | "ALL",
                })
              }
              className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Loading…" : "Apply"}
          </button>
          <button
            type="button"
            disabled={visibleRows.length === 0}
            onClick={handleExportCsv}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
          >
            Export CSV
          </button>
        </form>
        <p className="mt-2 text-xs text-zinc-500">
          Read-only view. Period key overrides from/to when valid (YYYY-MM). Category
          and status filters apply client-side after fetch.
        </p>
      </section>

      {error ? (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading && !hasLoaded ? (
        <p className="mt-4 text-zinc-600">Loading reconciliation…</p>
      ) : null}

      {!loading && hasLoaded && !error && allRows.length === 0 ? (
        <p className="mt-4 rounded border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
          No reconciliation data returned for the selected scope.
        </p>
      ) : null}

      {hasLoaded && allRows.length > 0 ? (
        <div className="mt-6 space-y-6">
          <section aria-label="Summary">
            <h2 className="text-base font-semibold">Summary</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded border border-zinc-200 p-4">
                <p className="text-sm text-zinc-600">Matched</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {summary.matchedCount}
                </p>
              </div>
              <div className="rounded border border-zinc-200 p-4">
                <p className="text-sm text-zinc-600">Unmatched</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {summary.unmatchedCount}
                </p>
              </div>
              <div className="rounded border border-zinc-200 p-4">
                <p className="text-sm text-zinc-600">Variance rows</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {summary.varianceCount}
                </p>
              </div>
              <div className="rounded border border-zinc-200 p-4">
                <p className="text-sm text-zinc-600">Total variance amount</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatAmount(summary.totalVarianceAmount)}
                </p>
              </div>
            </div>
            {appliedFilter.branchId || appliedFilter.periodKey ? (
              <p className="mt-2 text-xs text-zinc-500">
                Scope: branch={appliedFilter.branchId || "all"}, period=
                {appliedFilter.periodKey || formatPeriodLabel(appliedFilter)}
              </p>
            ) : null}
            {canCaptureSnapshotScope(appliedFilter) ? (
              <div className="mt-4 flex flex-wrap items-end gap-3 rounded border border-zinc-200 bg-zinc-50 p-4">
                <label className="flex flex-col gap-1 text-sm text-zinc-600">
                  Snapshot label (optional)
                  <input
                    type="text"
                    value={captureLabel}
                    onChange={(event) => setCaptureLabel(event.target.value)}
                    className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
                    placeholder="Month-end review"
                  />
                </label>
                <button
                  type="button"
                  disabled={captureLoading}
                  onClick={() => void handleCaptureSnapshot()}
                  className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {captureLoading ? "Capturing…" : "Capture snapshot"}
                </button>
              </div>
            ) : null}
            {captureMessage ? (
              <p className="mt-2 text-sm text-green-800">{captureMessage}</p>
            ) : null}
            {captureError ? (
              <p className="mt-2 text-sm text-red-800">{captureError}</p>
            ) : null}
          </section>

          <section aria-label="Reconciliation rows">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold">Reconciliation rows</h2>
              <p className="text-sm text-zinc-600">
                {visibleRows.length} of {allRows.length} rows
              </p>
            </div>
            <ReconciliationDashboardTable
              rows={visibleRows}
              onSelectRow={setSelectedRow}
            />
          </section>
        </div>
      ) : null}

      <VarianceDetailPanel
        row={selectedRow}
        issues={issues}
        issuesLoading={issuesLoading}
        issuesError={issuesError}
        onClose={() => setSelectedRow(null)}
      />
    </div>
  )
}
