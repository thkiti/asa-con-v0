"use client"

import { useState } from "react"
import { fetchRefundReconciliation } from "@/lib/finance-ui/fetchers"
import { formatAmount } from "@/lib/finance-ui/format"
import type {
  FinanceFilterValues,
  RefundReconciliationResult,
} from "@/lib/finance-ui/types"
import { FinanceFilterBar } from "./FinanceFilterBar"
import { ReconciliationTable } from "./ReconciliationTable"

export function RefundsReconciliationView() {
  const [filter, setFilter] = useState<FinanceFilterValues>({})
  const [result, setResult] = useState<RefundReconciliationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApply() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchRefundReconciliation(filter)
      setResult(data)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <FinanceFilterBar
        values={filter}
        onChange={setFilter}
        onApply={handleApply}
        loading={loading}
      />

      {error ? (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading && !result ? (
        <p className="mt-4 text-zinc-600">Loading reconciliation…</p>
      ) : null}

      {result ? (
        <div className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded border border-zinc-200 p-4">
              <p className="text-sm text-zinc-600">Operational refunds</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatAmount(result.operationalRefundTotal)}
              </p>
            </div>
            <div className="rounded border border-zinc-200 p-4">
              <p className="text-sm text-zinc-600">GL revenue reversal</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatAmount(result.glRefundRevenueTotal)}
              </p>
            </div>
            <div className="rounded border border-zinc-200 p-4">
              <p className="text-sm text-zinc-600">Variance rows</p>
              <p className="mt-1 text-lg font-semibold">
                {result.variances.length}
              </p>
            </div>
          </div>

          {result.paymentBreakdown.length > 0 ? (
            <div className="mt-8">
              <h2 className="text-base font-semibold">Tender breakdown</h2>
              <ReconciliationTable
                rows={result.paymentBreakdown}
                showReason={false}
              />
            </div>
          ) : null}

          <div className="mt-8">
            <h2 className="text-base font-semibold">Variances</h2>
            <ReconciliationTable rows={result.variances} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
