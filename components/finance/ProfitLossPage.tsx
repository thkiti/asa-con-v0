"use client"

import { useCallback, useState } from "react"
import {
  downloadProfitLossCsv,
  fetchProfitLoss,
  netIncomeLabel,
  type ProfitLossFilter,
} from "@/lib/finance-ui/profit-loss"
import { formatAmount } from "@/lib/finance-ui/format"
import type { ProfitLossResult } from "@/lib/finance-ui/types"

type FilterMode = "period" | "dateRange"

function SectionTable({
  title,
  rows,
  totalLabel,
  totalAmount,
}: {
  title: string
  rows: ProfitLossResult["revenue"]
  totalLabel: string
  totalAmount: string
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium text-zinc-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No {title.toLowerCase()} activity in scope.</p>
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
            <tfoot>
              <tr className="border-t border-zinc-300 font-semibold">
                <td className="px-2 py-2" colSpan={2}>
                  {totalLabel}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatAmount(totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}

export function ProfitLossPage() {
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
  const [result, setResult] = useState<ProfitLossResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildFilter = useCallback((): ProfitLossFilter => {
    const base: ProfitLossFilter = { branchId: branchId.trim() }
    if (filterMode === "period") {
      return { ...base, periodKey: periodKey.trim() }
    }
    return { ...base, from: from.trim(), to: to.trim() }
  }, [branchId, filterMode, from, periodKey, to])

  async function handleRefresh() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProfitLoss(buildFilter())
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profit & loss")
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
    downloadProfitLossCsv(result, `profit-loss-${result.filter.branchId}-${scope}.csv`)
  }

  function handlePrint() {
    window.print()
  }

  const incomeLabel = result ? netIncomeLabel(result.netIncome) : null

  return (
    <div className="space-y-6">
      <section className="print:hidden space-y-4">
        <p className="text-sm text-zinc-600">
          Period income statement from journal activity — revenue minus expenses equals
          net income. Activity-based only; no opening balances.
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
                  name="plFilterMode"
                  checked={filterMode === "period"}
                  onChange={() => setFilterMode("period")}
                />
                Period
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="plFilterMode"
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
        <div className="profit-loss-report space-y-8">
          <p className="text-sm text-zinc-600 print:text-black">
            Branch {result.filter.branchId}
            {result.filter.periodKey
              ? ` · Period ${result.filter.periodKey}`
              : result.filter.from && result.filter.to
                ? ` · ${result.filter.from} to ${result.filter.to}`
                : null}
          </p>

          <SectionTable
            title="Revenue"
            rows={result.revenue}
            totalLabel="Total Revenue"
            totalAmount={result.totalRevenue}
          />

          <SectionTable
            title="Expense"
            rows={result.expenses}
            totalLabel="Total Expense"
            totalAmount={result.totalExpense}
          />

          <section className="border-t-2 border-zinc-400 pt-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-zinc-500">Total Revenue</dt>
                <dd className="tabular-nums text-lg font-medium">
                  {formatAmount(result.totalRevenue)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Total Expense</dt>
                <dd className="tabular-nums text-lg font-medium">
                  {formatAmount(result.totalExpense)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Net Income</dt>
                <dd className="tabular-nums text-lg font-semibold">
                  {formatAmount(result.netIncome)}
                  {incomeLabel ? (
                    <span className="ml-2 text-sm font-normal text-zinc-600">
                      ({incomeLabel})
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      ) : null}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .profit-loss-report,
          .profit-loss-report * {
            visibility: visible;
          }
          .profit-loss-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
