"use client"

import Link from "next/link"
import { useCallback, useState } from "react"
import {
  downloadGeneralLedgerCsv,
  fetchGeneralLedger,
  type GeneralLedgerFilter,
} from "@/lib/finance-ui/general-ledger"
import { buildFinanceJournalInquiryPath } from "@/lib/finance-ui/finance-navigation"
import { formatAmount, formatDateTime } from "@/lib/finance-ui/format"
import type { GeneralLedgerResult } from "@/lib/finance-ui/types"
import {
  FINANCE_REPORT_TITLES,
  formatFinanceReportPeriodLabel,
} from "@/lib/finance-ui/finance-report-display"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import {
  financeMemo,
  financeNumber,
  financeReportTable,
  financeTableScroll,
  financeTh,
  financeThRight,
  financeReportSection,
  financeTextMuted,
} from "@/lib/finance-ui/finance-visual-classes"
import { formatEntityShort } from "@/lib/legal-entity/display"
import { themeLinkMuted } from "@/lib/theme/theme-classes"

type FilterMode = "period" | "dateRange"

export function GeneralLedgerPage() {
  const [filterMode, setFilterMode] = useState<FilterMode>("period")
  const [periodKey, setPeriodKey] = useState(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    return `${y}-${m}`
  })
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [accountCode, setAccountCode] = useState("")
  const [result, setResult] = useState<GeneralLedgerResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildFilter = useCallback((): GeneralLedgerFilter => {
    const base: GeneralLedgerFilter = {}
    if (accountCode.trim()) {
      base.accountCode = accountCode.trim()
    }
    if (filterMode === "period") {
      return { ...base, periodKey: periodKey.trim() }
    }
    return { ...base, from: from.trim(), to: to.trim() }
  }, [accountCode, filterMode, from, periodKey, to])

  async function handleRefresh() {
    if (!accountCode.trim()) {
      setError("Account code is required")
      setResult(null)
      return
    }
    if (filterMode === "dateRange" && (!from.trim() || !to.trim())) {
      setError("From and to dates are required for date range scope")
      setResult(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await fetchGeneralLedger(buildFilter())
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load general ledger")
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
    const accountSuffix = result.filter.accountCode ? `-${result.filter.accountCode}` : ""
    downloadGeneralLedgerCsv(
      result,
      `general-ledger-${formatEntityShort(result.filter.legalEntityCode)}-${scope}${accountSuffix}.csv`
    )
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-6">
      <section className="print:hidden space-y-4">
        <p className="text-sm text-zinc-600">
          Account-level ledger drill-down. Opening balance plus period activity equals
          closing balance. Journal rows link to inquiry for audit traceability.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600">Account code</span>
            <input
              className="rounded border border-zinc-300 px-2 py-1 font-mono text-xs"
              placeholder="1100"
              required
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value)}
            />
          </label>

          <fieldset className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600">Scope</span>
            <div className="flex gap-3">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="glFilterMode"
                  checked={filterMode === "period"}
                  onChange={() => setFilterMode("period")}
                />
                Period
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="glFilterMode"
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
        <section className="general-ledger-report" aria-label="General ledger results">
          <header className={`${financeReportSection} space-y-1`}>
            <p className="text-sm text-zinc-500">
              {formatEntityShort(result.filter.legalEntityCode)} •{" "}
              {FINANCE_REPORT_TITLES.generalLedger}
            </p>
            <p className="text-sm text-zinc-600">
              {formatFinanceReportPeriodLabel(result.filter)}
            </p>
            {result.filter.accountCode ? (
              <p className="text-sm text-zinc-500">Account {result.filter.accountCode}</p>
            ) : null}
          </header>

          {result.accounts.length === 0 ? (
            <p className="text-sm text-zinc-500">No accounts in scope.</p>
          ) : null}

          {result.accounts.map((account) => (
            <section
              key={account.accountCode}
              className={`${financeReportSection} general-ledger-account break-inside-avoid border-t border-zinc-300 pt-4`}
            >
              <header className="space-y-1">
                <h2 className="text-lg font-medium text-zinc-900">
                  <FinanceAccountDisplay
                    accountCode={account.accountCode}
                    accountName={account.accountName}
                    data-testid={`gl-account-${account.accountCode}`}
                  />
                  <span className="ml-2 text-sm font-normal text-zinc-500">
                    ({account.accountType})
                  </span>
                </h2>
                <p className="text-sm text-zinc-600">
                  Opening balance:{" "}
                  <span className="tabular-nums font-medium text-zinc-900">
                    {formatAmount(account.openingBalance)}
                  </span>
                  <span className="ml-3 text-zinc-500">
                    Dr {formatAmount(account.openingDebit)} / Cr{" "}
                    {formatAmount(account.openingCredit)}
                  </span>
                </p>
              </header>

              {account.transactions.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">No period transactions.</p>
              ) : (
                <div className={`mt-3 ${financeTableScroll}`}>
                  <table className={financeReportTable}>
                    <thead>
                      <tr>
                        <th className={financeTh}>Date</th>
                        <th className={financeTh}>Ref</th>
                        <th className={financeTh}>Description</th>
                        <th className={financeThRight}>Debit</th>
                        <th className={financeThRight}>Credit</th>
                        <th className={financeThRight}>Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.transactions.map((tx) => (
                        <tr key={tx.journalLineId}>
                          <td className={financeMemo}>{formatDateTime(tx.journalDate)}</td>
                          <td className={financeMemo}>
                            <div>{tx.entryNo}</div>
                            {tx.sourceRef ? (
                              <div className={financeTextMuted}>{tx.sourceRef}</div>
                            ) : null}
                          </td>
                          <td className={financeMemo}>
                            <Link
                              href={buildFinanceJournalInquiryPath(
                                tx.journalEntryId,
                                "/finance/reports/general-ledger"
                              )}
                              className={`${themeLinkMuted} print:no-underline`}
                            >
                              {tx.description ?? tx.lineMemo ?? "Journal entry"}
                            </Link>
                          </td>
                          <td className={financeNumber}>{formatAmount(tx.debit)}</td>
                          <td className={financeNumber}>{formatAmount(tx.credit)}</td>
                          <td className={financeNumber}>{formatAmount(tx.runningBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-3 text-sm font-medium text-zinc-900">
                Closing balance:{" "}
                <span className="tabular-nums">{formatAmount(account.closingBalance)}</span>
              </p>
            </section>
          ))}
        </section>
      ) : null}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .general-ledger-report,
          .general-ledger-report * {
            visibility: visible;
          }
          .general-ledger-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .general-ledger-account {
            page-break-inside: avoid;
            margin-bottom: 1.5rem;
          }
        }
      `}</style>
    </div>
  )
}
