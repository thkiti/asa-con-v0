"use client"

import { useCallback, useMemo, useState } from "react"
import {
  downloadTrialBalanceCsv,
  fetchTrialBalance,
  type TrialBalanceFilter,
} from "@/lib/finance-ui/trial-balance"
import { formatAmount } from "@/lib/finance-ui/format"
import type { TrialBalanceResult } from "@/lib/finance-ui/types"
import {
  FINANCE_REPORT_TITLES,
  formatFinanceReportPeriodLabel,
} from "@/lib/finance-ui/finance-report-display"
import { FinanceAccountOption } from "@/components/finance/FinanceAccountOption"
import { resolveAccountingPeriodKeyFilter } from "@/lib/finance-ui/accounting-period-input"
import {
  buildPeriodKeyFromYearMonth,
  defaultTrialBalancePeriodParts,
  formatCompactMonthOptionLabel,
  trialBalanceYearOptions,
  TRIAL_BALANCE_MONTH_VALUES,
} from "@/lib/finance-ui/trial-balance-period"
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
  financeTotalValue,
  financeReportSection,
} from "@/lib/finance-ui/finance-visual-classes"
import { FinanceScopeRadioFieldset } from "@/components/finance/FinanceScopeRadioFieldset"
import { formatEntityShort } from "@/lib/legal-entity/display"

type FilterMode = "period" | "dateRange"

export function TrialBalancePage() {
  const initialPeriod = useMemo(() => defaultTrialBalancePeriodParts(), [])
  const [filterMode, setFilterMode] = useState<FilterMode>("period")
  const [year, setYear] = useState(initialPeriod.year)
  const [month, setMonth] = useState(initialPeriod.month)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [hideZeroBalances, setHideZeroBalances] = useState(false)
  const [result, setResult] = useState<TrialBalanceResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const periodKey = buildPeriodKeyFromYearMonth(year, month)
  const yearOptions = useMemo(() => trialBalanceYearOptions(), [])

  const buildFilter = useCallback((): TrialBalanceFilter => {
    const base: TrialBalanceFilter = {
      hideZeroBalances,
    }
    if (filterMode === "period") {
      const normalized = resolveAccountingPeriodKeyFilter(periodKey)
      return {
        ...base,
        ...(normalized ? { periodKey: normalized } : { periodKey: periodKey.trim() }),
      }
    }
    return { ...base, from: from.trim(), to: to.trim() }
  }, [filterMode, from, hideZeroBalances, periodKey, to])

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
    downloadTrialBalanceCsv(
      result,
      `trial-balance-${formatEntityShort(result.filter.legalEntityCode)}-${scope}.csv`
    )
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

        <div className="finance-filter-row">
          <FinanceScopeRadioFieldset
            name="filterMode"
            value={filterMode}
            onChange={setFilterMode}
          />

          {filterMode === "period" ? (
            <>
              <div className="finance-filter-field finance-filter-field--period-year">
                <label htmlFor="tb-period-year" className="finance-filter-label">
                  Year
                </label>
                <select
                  id="tb-period-year"
                  className="finance-filter-control finance-filter-select tabular-nums"
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  data-testid="trial-balance-year"
                  aria-label="Year"
                >
                  {yearOptions.map((optionYear) => (
                    <option key={optionYear} value={optionYear}>
                      {optionYear}
                    </option>
                  ))}
                </select>
              </div>
              <div className="finance-filter-field finance-filter-field--period-month">
                <label htmlFor="tb-period-month" className="finance-filter-label">
                  Month
                </label>
                <select
                  id="tb-period-month"
                  className="finance-filter-control finance-filter-select"
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                  data-testid="trial-balance-month"
                  aria-label="Month"
                >
                  {TRIAL_BALANCE_MONTH_VALUES.map((optionMonth) => (
                    <option key={optionMonth} value={optionMonth}>
                      {formatCompactMonthOptionLabel(optionMonth)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="finance-filter-field finance-filter-field--date">
                <label htmlFor="tb-from-date" className="finance-filter-label">
                  From
                </label>
                <input
                  id="tb-from-date"
                  type="date"
                  className="finance-filter-control"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="finance-filter-field finance-filter-field--date">
                <label htmlFor="tb-to-date" className="finance-filter-label">
                  To
                </label>
                <input
                  id="tb-to-date"
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
              Hide zero-balance accounts
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
        <section className="trial-balance-report" aria-label="Trial balance results">
          <header className={`${financeReportSection} space-y-1`}>
            <p className="text-sm text-zinc-500">
              {formatEntityShort(result.filter.legalEntityCode)} •{" "}
              {FINANCE_REPORT_TITLES.trialBalance}
            </p>
            <p className="text-sm text-zinc-600">
              {formatFinanceReportPeriodLabel(result.filter)}
            </p>
            <p
              className={`text-sm font-medium ${
                result.isBalanced ? financeDiffBalanced : financeDiffUnbalanced
              }`}
            >
              {result.isBalanced ? "✓ Balanced" : "⚠ Out of Balance"}
            </p>
          </header>

          <div className={financeReportSection}>
            <div className={financeTableScroll}>
              <table className={financeReportTable}>
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
                      <FinanceAccountOption
                        code={row.accountCode}
                        name={row.accountName}
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
          </div>

          <dl className={`${financeReportSection} grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4`}>
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
