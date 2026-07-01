"use client"

import { useCallback, useState } from "react"
import { GeneralLedgerListView } from "@/components/finance/GeneralLedgerListView"
import { GeneralLedgerTAccountView } from "@/components/finance/GeneralLedgerTAccountView"
import {
  downloadGeneralLedgerCsv,
  fetchGeneralLedger,
  type GeneralLedgerFilter,
} from "@/lib/finance-ui/general-ledger"
import type { GeneralLedgerResult } from "@/lib/finance-ui/types"
import { FinanceScopeRadioFieldset } from "@/components/finance/FinanceScopeRadioFieldset"
import { GlAccountCombobox } from "@/components/finance/GlAccountCombobox"
import { formatEntityShort } from "@/lib/legal-entity/display"

type FilterMode = "period" | "dateRange"
type ViewMode = "list" | "t-account"

const GL_RETURN_TO = "/finance/reports/general-ledger"

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
  const [accountName, setAccountName] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [result, setResult] = useState<GeneralLedgerResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildFilter = useCallback(
    (codeOverride?: string): GeneralLedgerFilter => {
      const code = (codeOverride ?? accountCode).trim()
      const base: GeneralLedgerFilter = {}
      if (code) {
        base.accountCode = code
      }
      if (filterMode === "period") {
        return { ...base, periodKey: periodKey.trim() }
      }
      return { ...base, from: from.trim(), to: to.trim() }
    },
    [accountCode, filterMode, from, periodKey, to]
  )

  const refreshLedger = useCallback(
    async (codeOverride?: string) => {
      const code = (codeOverride ?? accountCode).trim()
      if (!code) {
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
        const data = await fetchGeneralLedger(buildFilter(code))
        setResult(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load general ledger")
        setResult(null)
      } finally {
        setLoading(false)
      }
    },
    [accountCode, buildFilter, filterMode, from, to]
  )

  function handleAccountChange(code: string, name: string) {
    setAccountCode(code)
    setAccountName(name)
    if (!code.trim()) {
      setResult(null)
      setError(null)
      return
    }
    void refreshLedger(code)
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
          <GlAccountCombobox
            accountCode={accountCode}
            accountName={accountName}
            onAccountChange={handleAccountChange}
            label="Account"
            inputTestId="gl-account-combobox-input"
            listTestId="gl-account-combobox-list"
          />

          <FinanceScopeRadioFieldset
            name="glFilterMode"
            value={filterMode}
            onChange={setFilterMode}
          />

          {filterMode === "period" ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600">Period key</span>
              <input
                className="rounded border border-zinc-300 px-2 py-1 font-mono text-xs"
                placeholder="2026-05"
                value={periodKey}
                onChange={(e) => setPeriodKey(e.target.value)}
                data-testid="gl-period-key"
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
                  data-testid="gl-from-date"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-600">To</span>
                <input
                  type="date"
                  className="rounded border border-zinc-300 px-2 py-1"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  data-testid="gl-to-date"
                />
              </label>
            </>
          )}

          <button
            type="button"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={loading}
            onClick={() => void refreshLedger()}
            data-testid="gl-refresh-button"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            type="button"
            className="rounded border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50"
            disabled={!result}
            onClick={handleExport}
            data-testid="gl-export-button"
          >
            Export CSV
          </button>
          <button
            type="button"
            className="rounded border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50"
            disabled={!result}
            onClick={handlePrint}
            data-testid="gl-print-button"
          >
            Print
          </button>
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </section>

      {result ? (
        <section className="general-ledger-report" aria-label="General ledger results">
          <fieldset className="print:hidden mb-3 text-sm" data-testid="gl-view-mode">
            <span className="mr-3 text-zinc-600">View</span>
            <div className="finance-radio-group inline-flex">
              <label className="finance-radio-option">
                <input
                  type="radio"
                  className="finance-radio-input"
                  name="glViewMode"
                  checked={viewMode === "list"}
                  onChange={() => setViewMode("list")}
                  data-testid="gl-view-list"
                />
                List
              </label>
              <label className="finance-radio-option">
                <input
                  type="radio"
                  className="finance-radio-input"
                  name="glViewMode"
                  checked={viewMode === "t-account"}
                  onChange={() => setViewMode("t-account")}
                  data-testid="gl-view-t-account"
                />
                T-account
              </label>
            </div>
          </fieldset>

          {result.accounts.length === 0 ? (
            <p className="text-sm text-zinc-500">No accounts in scope.</p>
          ) : null}

          {result.accounts.map((account) => (
            <section
              key={account.accountCode}
              className="general-ledger-account break-inside-avoid"
            >
              {viewMode === "list" ? (
                <GeneralLedgerListView account={account} returnTo={GL_RETURN_TO} />
              ) : (
                <GeneralLedgerTAccountView account={account} returnTo={GL_RETURN_TO} />
              )}
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
