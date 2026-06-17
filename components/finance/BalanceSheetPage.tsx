"use client"

import { useCallback, useState } from "react"
import {
  downloadBalanceSheetCsv,
  fetchBalanceSheet,
  type BalanceSheetFilter,
} from "@/lib/finance-ui/balance-sheet"
import { formatAmount } from "@/lib/finance-ui/format"
import type { BalanceSheetResult, BalanceSheetRow } from "@/lib/finance-ui/types"
import { formatEntityShort } from "@/lib/legal-entity/display"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import {
  financeAccount,
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTh,
  financeThRight,
  financeTotalLabel,
  financeTotalRowStrong,
  financeTotalValue,
} from "@/lib/finance-ui/finance-visual-classes"

type FilterMode = "period" | "dateRange"

function SectionTable({
  title,
  rows,
  totalLabel,
  totalAmount,
}: {
  title: string
  rows: BalanceSheetRow[]
  totalLabel: string
  totalAmount: string
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium text-zinc-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No {title.toLowerCase()} balances in scope.</p>
      ) : (
        <div className={financeTableScroll}>
          <table className={financeTable}>
            <thead>
              <tr>
                <th className={financeTh}>Account</th>
                <th className={financeThRight}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.accountCode}>
                  <td className={financeAccount}>
                    <FinanceAccountDisplay
                      accountCode={row.accountCode}
                      accountName={row.accountName}
                      data-testid={`balance-sheet-account-${row.accountCode}`}
                    />
                  </td>
                  <td className={financeNumber}>{formatAmount(row.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={financeTotalRowStrong}>
                <td className={financeTotalLabel} colSpan={1}>
                  {totalLabel}
                </td>
                <td className={financeTotalValue}>{formatAmount(totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}

export function BalanceSheetPage() {
  const [filterMode, setFilterMode] = useState<FilterMode>("period")
  const [periodKey, setPeriodKey] = useState(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    return `${y}-${m}`
  })
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [hideZeroBalances, setHideZeroBalances] = useState(false)
  const [result, setResult] = useState<BalanceSheetResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildFilter = useCallback((): BalanceSheetFilter => {
    const base: BalanceSheetFilter = {
      hideZeroBalances,
    }
    if (filterMode === "period") {
      return { ...base, periodKey: periodKey.trim() }
    }
    return { ...base, from: from.trim(), to: to.trim() }
  }, [filterMode, from, hideZeroBalances, periodKey, to])

  async function handleRefresh() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchBalanceSheet(buildFilter())
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load balance sheet")
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
    downloadBalanceSheetCsv(
      result,
      `balance-sheet-${formatEntityShort(result.filter.legalEntityCode)}-${scope}.csv`
    )
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-6">
      <section className="print:hidden space-y-4">
        <p className="text-sm text-zinc-600">
          Read-only balance sheet from posted journal activity — assets must equal
          liabilities plus equity for the selected scope.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <fieldset className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600">Scope</span>
            <div className="flex gap-3">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="bsFilterMode"
                  checked={filterMode === "period"}
                  onChange={() => setFilterMode("period")}
                />
                Period
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="bsFilterMode"
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
              <input
                className="rounded border border-zinc-300 px-2 py-1 font-mono text-xs"
                placeholder="2026-05"
                value={periodKey}
                onChange={(e) => setPeriodKey(e.target.value)}
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

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hideZeroBalances}
              onChange={(e) => setHideZeroBalances(e.target.checked)}
            />
            Hide zero balances
          </label>

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
        <section className="balance-sheet-report space-y-8">
          <div className="space-y-1 text-sm text-zinc-600 print:text-black">
            <p>
              {formatEntityShort(result.period.legalEntityCode)}
              {result.period.periodKey
                ? ` · Period ${result.period.periodKey}`
                : result.period.from && result.period.to
                  ? ` · ${result.period.from} to ${result.period.to}`
                  : null}
              {result.period.periodStatus
                ? ` · Status ${result.period.periodStatus}`
                : null}
            </p>
            <p
              className={
                result.isBalanced
                  ? "font-medium text-emerald-800"
                  : "font-medium text-amber-800"
              }
            >
              {result.isBalanced
                ? "Balanced — total assets equal liabilities plus equity."
                : `Out of balance — difference ${formatAmount(result.balanceDifference)}.`}
            </p>
          </div>

          <SectionTable
            title="Assets"
            rows={result.assets}
            totalLabel="Total assets"
            totalAmount={result.totalAssets}
          />
          <SectionTable
            title="Liabilities"
            rows={result.liabilities}
            totalLabel="Total liabilities"
            totalAmount={result.totalLiabilities}
          />
          <SectionTable
            title="Equity"
            rows={result.equity}
            totalLabel="Total equity"
            totalAmount={result.totalEquity}
          />

          <section className="rounded border border-zinc-200 bg-zinc-50 p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2 font-semibold">
              <span>Total liabilities + equity</span>
              <span className="tabular-nums">
                {formatAmount(result.totalLiabilitiesAndEquity)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-zinc-700">
              <span>Difference (assets − liabilities − equity)</span>
              <span className="tabular-nums">
                {formatAmount(result.balanceDifference)}
              </span>
            </div>
          </section>
        </section>
      ) : null}

      <style jsx global>{`
        @media print {
          .balance-sheet-report,
          .balance-sheet-report * {
            color: #000 !important;
          }
          .balance-sheet-report table {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
