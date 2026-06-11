"use client"

import { useCallback, useState } from "react"
import { formatAmount } from "@/lib/finance-ui/format"
import { netIncomeLabel } from "@/lib/finance-ui/profit-loss"
import {
  downloadRetainedEarningsCsv,
  fetchRetainedEarnings,
  type RetainedEarningsFilter,
} from "@/lib/finance-ui/retained-earnings"
import type { BalanceSheetRow, RetainedEarningsResult } from "@/lib/finance-ui/types"

type FilterMode = "period" | "dateRange"

function AccountTable({
  title,
  rows,
  emptyMessage,
}: {
  title: string
  rows: BalanceSheetRow[]
  emptyMessage: string
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium text-zinc-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="px-2 py-1">Account Code</th>
                <th className="px-2 py-1">Account Name</th>
                <th className="px-2 py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.accountCode} className="border-b border-zinc-100">
                  <td className="px-2 py-1 font-mono text-xs">{row.accountCode}</td>
                  <td className="px-2 py-1">{row.accountName}</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {formatAmount(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function BridgeLine({
  label,
  amount,
  emphasis = false,
}: {
  label: string
  amount: string
  emphasis?: boolean
}) {
  return (
    <div
      className={`flex flex-wrap justify-between gap-2 ${
        emphasis ? "border-t border-zinc-300 pt-2 font-semibold" : "text-zinc-700"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{formatAmount(amount)}</span>
    </div>
  )
}

export function RetainedEarningsPage() {
  const [filterMode, setFilterMode] = useState<FilterMode>("period")
  const [branchId, setBranchId] = useState("branch-1")
  const [periodKey, setPeriodKey] = useState(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    return `${y}-${m}`
  })
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [result, setResult] = useState<RetainedEarningsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildFilter = useCallback((): RetainedEarningsFilter => {
    const base: RetainedEarningsFilter = { branchId: branchId.trim() }
    if (filterMode === "period") {
      return { ...base, periodKey: periodKey.trim() }
    }
    return { ...base, from: from.trim(), to: to.trim() }
  }, [branchId, filterMode, from, periodKey, to])

  async function handleRefresh() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchRetainedEarnings(buildFilter())
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load retained earnings")
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
    downloadRetainedEarningsCsv(
      result,
      `retained-earnings-${result.filter.branchId}-${scope}.csv`
    )
  }

  function handlePrint() {
    window.print()
  }

  const incomeLabel = result ? netIncomeLabel(result.currentNetIncome) : "Income"

  return (
    <div className="space-y-6">
      <section className="print:hidden space-y-4">
        <p className="text-sm text-zinc-600">
          Read-only retained earnings analysis — posted account 301 plus current period net
          income explains economic equity before a closing entry (16H).
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600">Branch</span>
            <input
              className="rounded border border-zinc-300 px-2 py-1"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            />
          </label>

          <fieldset className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600">Scope</span>
            <div className="flex gap-3">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="reFilterMode"
                  checked={filterMode === "period"}
                  onChange={() => setFilterMode("period")}
                />
                Period
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="reFilterMode"
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
        <section className="retained-earnings-report space-y-8">
          <div className="space-y-1 text-sm text-zinc-600 print:text-black">
            <p>
              Branch {result.period.branchId}
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
                result.isEconomicallyBalanced
                  ? "font-medium text-emerald-800"
                  : "font-medium text-amber-800"
              }
            >
              {result.isEconomicallyBalanced
                ? "Economically balanced — assets equal liabilities plus adjusted equity."
                : "Not economically balanced — review reconciliation and trial balance."}
            </p>
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

          <AccountTable
            title="Retained earnings (account 301)"
            rows={result.retainedEarningsAccounts}
            emptyMessage="No account 301 balance in scope."
          />

          <AccountTable
            title="Other equity"
            rows={result.otherEquityAccounts}
            emptyMessage="No other equity accounts in scope."
          />

          <section className="rounded border border-zinc-200 bg-zinc-50 p-4 text-sm space-y-2">
            <h2 className="text-lg font-medium text-zinc-900">Retained earnings bridge</h2>
            <BridgeLine
              label="Posted retained earnings (301, in scope)"
              amount={result.postedRetainedEarnings}
            />
            <BridgeLine
              label={`Current net ${incomeLabel.toLowerCase()}`}
              amount={result.currentNetIncome}
            />
            <BridgeLine
              label="Adjusted retained earnings"
              amount={result.adjustedRetainedEarnings}
              emphasis
            />
          </section>

          <section className="rounded border border-zinc-200 bg-zinc-50 p-4 text-sm space-y-2">
            <h2 className="text-lg font-medium text-zinc-900">Equity bridge</h2>
            <BridgeLine
              label="Posted total equity (balance sheet)"
              amount={result.postedTotalEquity}
            />
            {result.otherEquityTotal !== "0" ? (
              <BridgeLine label="Of which other equity" amount={result.otherEquityTotal} />
            ) : null}
            <BridgeLine
              label={`Current net ${incomeLabel.toLowerCase()}`}
              amount={result.currentNetIncome}
            />
            <BridgeLine
              label="Adjusted total equity"
              amount={result.adjustedTotalEquity}
              emphasis
            />
          </section>

          <section className="rounded border border-zinc-200 p-4 text-sm space-y-2">
            <h2 className="text-lg font-medium text-zinc-900">Balance sheet reconciliation</h2>
            <BridgeLine label="Total assets" amount={result.totalAssets} />
            <BridgeLine label="Total liabilities" amount={result.totalLiabilities} />
            <BridgeLine
              label="Balance sheet difference (unclosed P&L gap)"
              amount={result.balanceSheetDifference}
            />
            <BridgeLine
              label="Unclosed earnings gap (difference − net income)"
              amount={result.unclosedEarningsGap}
            />
            <p className="pt-2 text-zinc-600">
              {result.isUnclosedEarningsExplained
                ? "Gap fully explained by current net income — expected before closing entry."
                : "Gap does not match net income — investigate trial balance integrity."}
            </p>
          </section>
        </section>
      ) : null}

      <style jsx global>{`
        @media print {
          .retained-earnings-report,
          .retained-earnings-report * {
            color: #000 !important;
          }
          .retained-earnings-report section {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
