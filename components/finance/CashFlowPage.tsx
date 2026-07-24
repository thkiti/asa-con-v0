"use client"

import { useCallback, useState } from "react"
import { AccountingPeriodSelect } from "@/components/finance/AccountingPeriodSelect"
import { resolveAccountingPeriodKeyFilter } from "@/lib/finance-ui/accounting-period-input"
import { useAccountingPeriodOptions } from "@/lib/finance-ui/use-accounting-period-options"
import {
  downloadCashFlowCsv,
  fetchCashFlow,
  type CashFlowFilter,
} from "@/lib/finance-ui/cash-flow"
import { formatAmount } from "@/lib/finance-ui/format"
import type { CashFlowResult, CashFlowSection } from "@/lib/finance-ui/types"
import {
  financeAccountName,
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
  section,
}: {
  title: string
  section: CashFlowSection
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium text-zinc-900">{title}</h2>
      {section.lines.length === 0 ? (
        <p className="text-sm text-zinc-500">No lines in scope.</p>
      ) : (
        <div className={financeTableScroll}>
          <table className={financeTable}>
            <thead>
              <tr>
                <th className={financeTh}>Line</th>
                <th className={financeThRight}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {section.lines.map((line) => (
                <tr key={line.key}>
                  <td className={financeAccountName}>{line.label}</td>
                  <td className={financeNumber}>{formatAmount(line.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={financeTotalRowStrong}>
                <td className={financeTotalLabel}>Subtotal</td>
                <td className={financeTotalValue}>{formatAmount(section.subtotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}

export function CashFlowPage() {
  const { periods, loading: periodsLoading } = useAccountingPeriodOptions()
  const [filterMode, setFilterMode] = useState<FilterMode>("period")
  const [periodKey, setPeriodKey] = useState(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    return `${y}-${m}`
  })
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [result, setResult] = useState<CashFlowResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildFilter = useCallback((): CashFlowFilter => {
    if (filterMode === "period") {
      const normalized = resolveAccountingPeriodKeyFilter(periodKey)
      return normalized ? { periodKey: normalized } : { periodKey: periodKey.trim() }
    }
    return { from: from.trim(), to: to.trim() }
  }, [filterMode, from, periodKey, to])

  async function handleRefresh() {
    if (filterMode === "dateRange" && (!from.trim() || !to.trim())) {
      setError("From and to dates are required for date range scope")
      setResult(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await fetchCashFlow(buildFilter())
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cash flow statement")
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
    downloadCashFlowCsv(result, `cash-flow-${scope}.csv`)
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-6">
      <section className="print:hidden space-y-4">
        <p className="text-sm text-zinc-600">
          Indirect cash flow statement from posted journals. Composes profit &amp; loss net income,
          working-capital balance changes from general ledger, and equity financing flows from
          changes in equity. Cash reconciliation ties computed movement to cash and equivalents
          accounts (1100, 1110).
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <fieldset className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-600">Scope</span>
            <div className="finance-radio-group">
              <label className="finance-radio-option">
                <input
                  type="radio"
                  className="finance-radio-input"
                  name="cfFilterMode"
                  checked={filterMode === "period"}
                  onChange={() => setFilterMode("period")}
                />
                Period
              </label>
              <label className="finance-radio-option">
                <input
                  type="radio"
                  className="finance-radio-input"
                  name="cfFilterMode"
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
              <AccountingPeriodSelect
                className="rounded border border-zinc-300 px-2 py-1 font-mono text-xs"
                periods={periods}
                value={periodKey.trim() || null}
                onChange={setPeriodKey}
                loading={periodsLoading}
                showEmptyHint={false}
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
        <div className="cash-flow-report space-y-6">
          <p className="text-sm text-zinc-600 print:text-black">
            {result.filter.periodKey
              ? `Period ${result.filter.periodKey}`
              : result.filter.from && result.filter.to
                ? `${result.filter.from} to ${result.filter.to}`
                : null}
            · Indirect method
          </p>

          {result.warnings.length > 0 ? (
            <div
              className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 print:border-zinc-300 print:bg-white"
              role="status"
            >
              <p className="font-medium">Warnings</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {result.warnings.map((warning, index) => (
                  <li key={`${warning.code}-${index}`}>{warning.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <section
            className={`rounded border p-4 text-sm ${
              result.cashReconciliation.isReconciled
                ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                : "border-red-200 bg-red-50 text-red-950"
            } print:border-zinc-300 print:bg-white print:text-black`}
          >
            <h2 className="font-medium">Cash reconciliation</h2>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-zinc-600">Opening cash &amp; equivalents</dt>
                <dd className="tabular-nums font-medium">
                  {formatAmount(result.cashReconciliation.openingCashAndEquivalents)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-600">Closing cash &amp; equivalents</dt>
                <dd className="tabular-nums font-medium">
                  {formatAmount(result.cashReconciliation.closingCashAndEquivalents)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-600">Change per ledger (1100 + 1110)</dt>
                <dd className="tabular-nums font-medium">
                  {formatAmount(result.cashReconciliation.glChange)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-600">Computed net change in cash</dt>
                <dd className="tabular-nums font-medium">
                  {formatAmount(result.cashReconciliation.computedChange)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-600">Difference</dt>
                <dd className="tabular-nums font-medium">
                  {formatAmount(result.cashReconciliation.difference)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-600">Status</dt>
                <dd className="font-medium">
                  {result.cashReconciliation.isReconciled ? "Reconciled" : "Not reconciled"}
                </dd>
              </div>
            </dl>
          </section>

          <SectionTable title="Operating activities" section={result.sections.operating} />
          <SectionTable title="Investing activities" section={result.sections.investing} />
          <SectionTable title="Financing activities" section={result.sections.financing} />

          <p className="border-t border-zinc-300 pt-4 text-base font-semibold text-zinc-900">
            Net change in cash:{" "}
            <span className="tabular-nums">{formatAmount(result.netChangeInCash)}</span>
          </p>
        </div>
      ) : null}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .cash-flow-report,
          .cash-flow-report * {
            visibility: visible;
          }
          .cash-flow-report {
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
