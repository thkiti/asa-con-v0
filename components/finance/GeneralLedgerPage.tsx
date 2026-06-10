"use client"

import Link from "next/link"
import { useCallback, useState } from "react"
import {
  downloadGeneralLedgerCsv,
  fetchGeneralLedger,
  type GeneralLedgerFilter,
} from "@/lib/finance-ui/general-ledger"
import { formatAmount, formatDateTime } from "@/lib/finance-ui/format"
import type { GeneralLedgerResult } from "@/lib/finance-ui/types"

type FilterMode = "period" | "dateRange"

export function GeneralLedgerPage() {
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
  const [accountCode, setAccountCode] = useState("")
  const [result, setResult] = useState<GeneralLedgerResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildFilter = useCallback((): GeneralLedgerFilter => {
    const base: GeneralLedgerFilter = { branchId: branchId.trim() }
    if (accountCode.trim()) {
      base.accountCode = accountCode.trim()
    }
    if (filterMode === "period") {
      return { ...base, periodKey: periodKey.trim() }
    }
    return { ...base, from: from.trim(), to: to.trim() }
  }, [accountCode, branchId, filterMode, from, periodKey, to])

  async function handleRefresh() {
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
      `general-ledger-${result.filter.branchId}-${scope}${accountSuffix}.csv`
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
            <span className="text-zinc-600">Branch</span>
            <input
              className="rounded border border-zinc-300 px-2 py-1"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600">Account code (optional)</span>
            <input
              className="rounded border border-zinc-300 px-2 py-1 font-mono text-xs"
              placeholder="1100"
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
        <div className="general-ledger-report space-y-8">
          <p className="text-sm text-zinc-600 print:text-black">
            Branch {result.filter.branchId}
            {result.filter.periodKey
              ? ` · Period ${result.filter.periodKey}`
              : result.filter.from && result.filter.to
                ? ` · ${result.filter.from} to ${result.filter.to}`
                : null}
            {result.filter.accountCode ? ` · Account ${result.filter.accountCode}` : null}
          </p>

          {result.accounts.length === 0 ? (
            <p className="text-sm text-zinc-500">No accounts in scope.</p>
          ) : null}

          {result.accounts.map((account) => (
            <section
              key={account.accountCode}
              className="general-ledger-account break-inside-avoid border-t border-zinc-300 pt-4"
            >
              <header className="space-y-1">
                <h2 className="text-lg font-medium text-zinc-900">
                  <span className="font-mono text-sm">{account.accountCode}</span>
                  <span className="ml-2">{account.accountName}</span>
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
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-zinc-500">
                        <th className="px-2 py-1">Date</th>
                        <th className="px-2 py-1">Entry No</th>
                        <th className="px-2 py-1">Description</th>
                        <th className="px-2 py-1 text-right">Debit</th>
                        <th className="px-2 py-1 text-right">Credit</th>
                        <th className="px-2 py-1 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.transactions.map((tx) => (
                        <tr key={`${tx.journalEntryId}-${tx.entryNo}-${tx.debit}-${tx.credit}`} className="border-b border-zinc-100">
                          <td className="px-2 py-1 whitespace-nowrap">
                            {formatDateTime(tx.journalDate)}
                          </td>
                          <td className="px-2 py-1 font-mono text-xs">{tx.entryNo}</td>
                          <td className="px-2 py-1 text-zinc-700">
                            <Link
                              href={`/finance/journal-entries/${tx.journalEntryId}`}
                              className="underline print:no-underline"
                            >
                              {tx.description ?? tx.lineMemo ?? "Journal entry"}
                            </Link>
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums">
                            {formatAmount(tx.debit)}
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums">
                            {formatAmount(tx.credit)}
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums">
                            {formatAmount(tx.runningBalance)}
                          </td>
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
        </div>
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
