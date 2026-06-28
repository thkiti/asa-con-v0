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
import {
  FINANCE_REPORT_TITLES,
  formatFinanceReportPeriodLabel,
} from "@/lib/finance-ui/finance-report-display"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import {
  financeAccount,
  financeNumber,
  financeReportTable,
  financeTableScroll,
  financeTh,
  financeThRight,
  financeTotalLabel,
  financeTotalRowStrong,
  financeReportSection,
  financeTotalValue,
} from "@/lib/finance-ui/finance-visual-classes"
import { formatEntityShort } from "@/lib/legal-entity/display"

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
    <section className={financeReportSection}>
      <h2 className="text-lg font-medium text-zinc-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No {title.toLowerCase()} activity in scope.</p>
      ) : (
        <div className={financeTableScroll}>
          <table className={financeReportTable}>
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
                      data-testid={`profit-loss-account-${row.accountCode}`}
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

export function ProfitLossPage() {
  const [filterMode, setFilterMode] = useState<FilterMode>("period")
  const [branchId, setBranchId] = useState("")
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
    const base: ProfitLossFilter = {}
    if (branchId.trim()) {
      base.branchId = branchId.trim()
    }
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
    const branchSuffix = result.filter.branchId ? `-${result.filter.branchId}` : ""
    downloadProfitLossCsv(result, `profit-loss${branchSuffix}-${scope}.csv`)
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
            <span className="text-zinc-600">Branch (optional)</span>
            <input
              className="rounded border border-zinc-300 px-2 py-1 font-mono text-xs"
              placeholder="All branches"
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
        <section className="profit-loss-report" aria-label="Profit and loss results">
          <header className={`${financeReportSection} space-y-1`}>
            <p className="text-sm text-zinc-500">
              {formatEntityShort(result.filter.legalEntityCode)} •{" "}
              {FINANCE_REPORT_TITLES.profitLoss}
            </p>
            <p className="text-sm text-zinc-600">
              {formatFinanceReportPeriodLabel(result.filter)}
            </p>
            <p className="text-sm font-medium text-zinc-700">
              Net income: {formatAmount(result.netIncome)}
              {incomeLabel ? ` (${incomeLabel})` : ""}
            </p>
            {result.filter.branchId ? (
              <p className="text-sm text-zinc-500">Branch {result.filter.branchId}</p>
            ) : null}
          </header>

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
        </section>
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
