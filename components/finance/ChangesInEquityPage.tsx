"use client"

import { useCallback, useState } from "react"
import {
  downloadChangesInEquityCsv,
  fetchChangesInEquity,
  type ChangesInEquityFilter,
} from "@/lib/finance-ui/changes-in-equity"
import { formatAmount } from "@/lib/finance-ui/format"
import type { ChangesInEquityResult, ChangesInEquityRowKey } from "@/lib/finance-ui/types"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import { AccountingPeriodSelect } from "@/components/finance/AccountingPeriodSelect"
import { resolveAccountingPeriodKeyFilter } from "@/lib/finance-ui/accounting-period-input"
import { useAccountingPeriodOptions } from "@/lib/finance-ui/use-accounting-period-options"
import {
  financeAccountName,
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
  financeThRight,
  financeTotalRow,
  financeTotalRowStrong,
} from "@/lib/finance-ui/finance-visual-classes"

type FilterMode = "period" | "dateRange"

function profitSourceLabel(source: ChangesInEquityResult["profitSource"]): string {
  if (source === "CLOSING_ENTRY") {
    return "Posted closing entry — profit row uses posted net income (posted truth)."
  }
  return "Profit & loss preview — period not closed; closing balance excludes unposted net income."
}

function rowClassName(rowKey: ChangesInEquityRowKey, isBalanced: boolean): string {
  if (rowKey === "RECONCILIATION_CHECK") {
    return isBalanced
      ? `${financeTotalRow} bg-zinc-50 font-medium`
      : "bg-amber-50 font-medium text-amber-950"
  }
  if (rowKey === "CLOSING") {
    return financeTotalRowStrong
  }
  return ""
}

export function ChangesInEquityPage() {
  const { periods, loading: periodsLoading } = useAccountingPeriodOptions()
  const [filterMode, setFilterMode] = useState<FilterMode>("period")
  const [periodKey, setPeriodKey] = useState(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    return `${y}-${m}`
  })
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [result, setResult] = useState<ChangesInEquityResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildFilter = useCallback((): ChangesInEquityFilter => {
    if (filterMode === "period") {
      const normalized = resolveAccountingPeriodKeyFilter(periodKey)
      return normalized ? { periodKey: normalized } : { periodKey: periodKey.trim() }
    }
    return { from: from.trim(), to: to.trim() }
  }, [filterMode, from, periodKey, to])

  async function handleRefresh() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchChangesInEquity(buildFilter())
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load changes in equity")
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  function handleExport() {
    if (!result) return
    const scope =
      result.filter.periodKey ??
      `${result.filter.from ?? ""}_${result.filter.to ?? ""}`.replace(/__/g, "")
    downloadChangesInEquityCsv(result, `changes-in-equity-${scope}.csv`)
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-6">
      <section className="print:hidden space-y-4">
        <p className="text-sm text-zinc-600">
          Read-only statement of changes in equity — opening and closing balances from cumulative
          general ledger activity, profit from closing entry or profit &amp; loss, and other equity
          journal movements in the period (excluding closing entry vouchers).
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <fieldset className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600">Scope</span>
            <div className="finance-radio-group">
              <label className="finance-radio-option">
                <input
                  type="radio"
                  className="finance-radio-input"
                  name="cieFilterMode"
                  checked={filterMode === "period"}
                  onChange={() => setFilterMode("period")}
                />
                Period
              </label>
              <label className="finance-radio-option">
                <input
                  type="radio"
                  className="finance-radio-input"
                  name="cieFilterMode"
                  checked={filterMode === "dateRange"}
                  onChange={() => setFilterMode("dateRange")}
                />
                Date range
              </label>
            </div>
          </fieldset>

          {filterMode === "period" ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600">Period key</span>
              <AccountingPeriodSelect
                className="rounded border border-zinc-300 px-2 py-1 font-mono text-xs"
                periods={periods}
                value={periodKey.trim() || null}
                onChange={setPeriodKey}
                loading={periodsLoading}
                showEmptyHint={false}
              />
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-600">From</span>
                <input
                  type="date"
                  className="rounded border border-zinc-300 px-2 py-1"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-600">To</span>
                <input
                  type="date"
                  className="rounded border border-zinc-300 px-2 py-1"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </>
          )}

          <button
            type="button"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={loading}
            onClick={() => void handleRefresh()}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            type="button"
            className="rounded border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50"
            disabled={!result}
            onClick={handleExport}
          >
            Export CSV
          </button>
          <button
            type="button"
            className="rounded border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50"
            disabled={!result}
            onClick={handlePrint}
          >
            Print
          </button>
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </section>

      {result ? (
        <section className="changes-in-equity-report space-y-6">
          <div className="space-y-1 text-sm text-zinc-600 print:text-black">
            <p>
              {result.period.periodKey
                ? `Period ${result.period.periodKey}`
                : result.period.from && result.period.to
                  ? `${result.period.from} to ${result.period.to}`
                  : null}
              {result.period.periodStatus
                ? ` · Status ${result.period.periodStatus}`
                : null}
            </p>
            <p
              className={
                result.reconciliation.isBalanced
                  ? "font-medium text-emerald-800"
                  : "font-medium text-amber-800"
              }
            >
              {result.reconciliation.isBalanced
                ? "Reconciled — opening + profit + other changes equals closing for each equity account."
                : `Not reconciled — total difference ${formatAmount(result.reconciliation.totalDifference)}.`}
            </p>
            <p className="text-zinc-700">{profitSourceLabel(result.profitSource)}</p>
            {result.activeClosingEntry ? (
              <p className="font-mono text-xs text-zinc-600">
                Closing entry {result.activeClosingEntry.voucherNo} · net income{" "}
                {formatAmount(result.activeClosingEntry.netIncome)}
              </p>
            ) : null}
          </div>

          {result.warnings.length > 0 ? (
            <section className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <h2 className="font-medium">Warnings</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {result.warnings.map((warning) => (
                  <li key={warning.code}>{warning.message}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {result.columns.length === 0 ? (
            <p className="text-sm text-zinc-500">No equity account activity in scope.</p>
          ) : (
            <div className={financeTableScroll}>
              <table className={financeTable}>
                <thead>
                  <tr>
                    <th className={financeTh}>Row</th>
                    {result.columns.map((column) => (
                      <th key={column.accountCode} className={financeTh}>
                        <FinanceAccountDisplay
                          accountCode={column.accountCode}
                          accountName={column.accountName}
                          data-testid={`cie-column-account-${column.accountCode}`}
                        />
                      </th>
                    ))}
                    <th className={financeThRight}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.rowKey} className={rowClassName(row.rowKey, result.reconciliation.isBalanced)}>
                      <td className={financeAccountName}>{row.label}</td>
                      {result.columns.map((column) => (
                        <td
                          key={`${row.rowKey}-${column.accountCode}`}
                          className={financeNumber}
                        >
                          {formatAmount(row.amounts[column.accountCode] ?? "0")}
                        </td>
                      ))}
                      <td className={financeNumber}>{formatAmount(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <style jsx global>{`
        @media print {
          .changes-in-equity-report,
          .changes-in-equity-report * {
            color: #000 !important;
          }
          .changes-in-equity-report table {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
