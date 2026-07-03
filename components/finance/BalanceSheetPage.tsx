"use client"

import { useCallback, useState } from "react"
import {
  downloadBalanceSheetCsv,
  fetchBalanceSheet,
  type BalanceSheetFilter,
} from "@/lib/finance-ui/balance-sheet"
import { formatAmount } from "@/lib/finance-ui/format"
import type { BalanceSheetResult, BalanceSheetRow } from "@/lib/finance-ui/types"
import {
  FINANCE_REPORT_TITLES,
  formatFinanceReportPeriodLabel,
} from "@/lib/finance-ui/finance-report-display"
import { FinanceScopeRadioFieldset } from "@/components/finance/FinanceScopeRadioFieldset"
import { AccountingPeriodInput } from "@/components/finance/AccountingPeriodInput"
import { resolveAccountingPeriodKeyFilter } from "@/lib/finance-ui/accounting-period-input"
import { formatEntityShort } from "@/lib/legal-entity/display"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import {
  financeAccount,
  financeDiffBalanced,
  financeDiffUnbalanced,
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
    <section className={financeReportSection}>
      <h2 className="text-lg font-medium text-zinc-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No {title.toLowerCase()} balances in scope.</p>
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
      const normalized = resolveAccountingPeriodKeyFilter(periodKey)
      return { ...base, ...(normalized ? { periodKey: normalized } : { periodKey: periodKey.trim() }) }
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

        <div className="finance-filter-row">
          <FinanceScopeRadioFieldset
            name="bsFilterMode"
            value={filterMode}
            onChange={setFilterMode}
          />

          {filterMode === "period" ? (
            <div className="finance-filter-field finance-filter-field--period-key">
              <label htmlFor="bs-period-key" className="finance-filter-label">
                Period key
              </label>
              <AccountingPeriodInput
                id="bs-period-key"
                className="finance-filter-control finance-filter-control--mono"
                value={periodKey}
                onChange={setPeriodKey}
              />
            </div>
          ) : (
            <>
              <div className="finance-filter-field finance-filter-field--date">
                <label htmlFor="bs-from-date" className="finance-filter-label">
                  From
                </label>
                <input
                  id="bs-from-date"
                  type="date"
                  className="finance-filter-control"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="finance-filter-field finance-filter-field--date">
                <label htmlFor="bs-to-date" className="finance-filter-label">
                  To
                </label>
                <input
                  id="bs-to-date"
                  type="date"
                  className="finance-filter-control"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="finance-filter-field">
            <span className="finance-filter-label">Zero balances</span>
            <label className="finance-filter-control finance-filter-control--checkbox">
              <input
                type="checkbox"
                checked={hideZeroBalances}
                onChange={(e) => setHideZeroBalances(e.target.checked)}
              />
              Hide zero balances
            </label>
          </div>

          <div className="finance-filter-actions">
            <button
              type="button"
              className="finance-filter-control finance-filter-button finance-filter-button--primary"
              disabled={loading}
              onClick={() => void handleRefresh()}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button
              type="button"
              className="finance-filter-control finance-filter-button finance-filter-button--secondary"
              disabled={!result}
              onClick={handleExport}
            >
              Export CSV
            </button>
            <button
              type="button"
              className="finance-filter-control finance-filter-button finance-filter-button--secondary"
              disabled={!result}
              onClick={handlePrint}
            >
              Print
            </button>
          </div>
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </section>

      {result ? (
        <section className="balance-sheet-report" aria-label="Balance sheet results">
          <header className={`${financeReportSection} space-y-1`}>
            <p className="text-sm text-zinc-500">
              {formatEntityShort(result.period.legalEntityCode)} •{" "}
              {FINANCE_REPORT_TITLES.balanceSheet}
            </p>
            <p className="text-sm text-zinc-600">
              {formatFinanceReportPeriodLabel(result.period)}
            </p>
            <p
              className={`text-sm font-medium ${
                result.isBalanced ? financeDiffBalanced : financeDiffUnbalanced
              }`}
            >
              {result.isBalanced
                ? "✓ Balanced"
                : `⚠ Out of balance — ${formatAmount(result.balanceDifference)}`}
            </p>
          </header>

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
