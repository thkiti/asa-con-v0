"use client"

import { useCallback, useState } from "react"
import {
  downloadTrialBalanceCsv,
  fetchTrialBalance,
  type TrialBalanceFilter,
} from "@/lib/finance-ui/trial-balance"
import { formatAmount } from "@/lib/finance-ui/format"
import type { TrialBalanceResult } from "@/lib/finance-ui/types"
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

export function TrialBalancePage() {
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
  const [hideZeroBalances, setHideZeroBalances] = useState(false)
  const [result, setResult] = useState<TrialBalanceResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildFilter = useCallback((): TrialBalanceFilter => {
    const base: TrialBalanceFilter = {
      branchId: branchId.trim(),
      hideZeroBalances,
    }
    if (filterMode === "period") {
      return { ...base, periodKey: periodKey.trim() }
    }
    return { ...base, from: from.trim(), to: to.trim() }
  }, [branchId, filterMode, from, hideZeroBalances, periodKey, to])

  async function handleRefresh() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTrialBalance(buildFilter())
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trial balance")
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
    downloadTrialBalanceCsv(result, `trial-balance-${result.filter.branchId}-${scope}.csv`)
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-6">
      <section className="print:hidden space-y-4">
        <p className="text-sm text-zinc-600">
          Accounting integrity report — total debits must equal total credits for the
          selected scope.
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
                  name="filterMode"
                  checked={filterMode === "period"}
                  onChange={() => setFilterMode("period")}
                />
                Period
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="filterMode"
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
            Hide zero-balance accounts
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
        <section className="trial-balance-report space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium text-zinc-900">Trial Balance</h2>
            <p
              className={
                result.isBalanced
                  ? "text-sm font-medium text-emerald-700"
                  : "text-sm font-medium text-amber-700"
              }
            >
              {result.isBalanced ? "✓ Balanced" : "⚠ Out of Balance"}
            </p>
          </div>

          <p className="text-sm text-zinc-600">
            Branch {result.filter.branchId}
            {result.filter.periodKey
              ? ` · Period ${result.filter.periodKey}`
              : result.filter.from && result.filter.to
                ? ` · ${result.filter.from} to ${result.filter.to}`
                : null}
          </p>

          <div className={financeTableScroll}>
            <table className={financeTable}>
              <thead>
                <tr>
                  <th className={financeTh}>Account</th>
                  <th className={financeThRight}>Debit</th>
                  <th className={financeThRight}>Credit</th>
                  <th className={financeThRight}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.accountCode}>
                    <td className={financeAccount}>
                      <FinanceAccountDisplay
                        accountCode={row.accountCode}
                        accountName={row.accountName}
                        data-testid={`trial-balance-account-${row.accountCode}`}
                      />
                    </td>
                    <td className={financeNumber}>{formatAmount(row.totalDebit)}</td>
                    <td className={financeNumber}>{formatAmount(row.totalCredit)}</td>
                    <td className={financeNumber}>{formatAmount(row.signedBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={financeTotalRowStrong}>
                  <td className={financeTotalLabel} colSpan={1}>
                    Totals
                  </td>
                  <td className={financeTotalValue}>
                    {formatAmount(result.totalDebits)}
                  </td>
                  <td className={financeTotalValue}>
                    {formatAmount(result.totalCredits)}
                  </td>
                  <td className={financeTotalValue}>
                    {formatAmount(result.difference)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-zinc-500">Total Debit</dt>
              <dd className="tabular-nums">{formatAmount(result.totalDebits)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Total Credit</dt>
              <dd className="tabular-nums">{formatAmount(result.totalCredits)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Difference</dt>
              <dd className="tabular-nums">{formatAmount(result.difference)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Status</dt>
              <dd>{result.isBalanced ? "✓ Balanced" : "⚠ Out of Balance"}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .trial-balance-report,
          .trial-balance-report * {
            visibility: visible;
          }
          .trial-balance-report {
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
