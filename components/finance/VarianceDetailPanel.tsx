"use client"

import { formatAmount, formatVarianceLabel } from "@/lib/finance-ui/format"
import type { ReconciliationDashboardRow } from "@/lib/finance-ui/reconciliation"
import { ReconciliationStatusBadge } from "./ReconciliationStatusBadge"

type VarianceDetailPanelProps = {
  row: ReconciliationDashboardRow | null
  onClose: () => void
}

export function VarianceDetailPanel({ row, onClose }: VarianceDetailPanelProps) {
  if (!row) {
    return null
  }

  const reference = row.reference

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(reference)
    } catch {
      // clipboard unavailable in test/static environments
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="variance-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="variance-detail-title" className="text-lg font-semibold">
              Variance detail
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{row.reference}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            Close
          </button>
        </div>

        <dl className="mt-6 grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">Source type</dt>
            <dd>{row.sourceType}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">Branch</dt>
            <dd className="font-mono text-xs">{row.branchId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">Period</dt>
            <dd>{row.periodLabel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">Status</dt>
            <dd>
              <ReconciliationStatusBadge status={row.status} />
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">Expected (operational)</dt>
            <dd className="tabular-nums">{formatAmount(row.expectedAmount)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">Actual (GL)</dt>
            <dd className="tabular-nums">{formatAmount(row.actualAmount)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">Variance</dt>
            <dd className="tabular-nums">{formatVarianceLabel(row.variance)}</dd>
          </div>
        </dl>

        <div className="mt-6 rounded border border-zinc-200 bg-zinc-50 p-4 text-sm">
          <p className="font-medium text-zinc-800">Explanation</p>
          <p className="mt-2 text-zinc-700">
            {row.varianceReason ??
              "Read-only reconciliation comparison between operational totals and GL balances. No automatic adjustment is applied."}
          </p>
          {row.varianceType ? (
            <p className="mt-2 text-zinc-600">Type: {row.varianceType}</p>
          ) : null}
          <p className="mt-2 text-zinc-500">
            Voucher/journal refs are derived at posting time; investigate linked
            operational documents ({row.sourceType.toLowerCase()}) in source
            systems. This view does not mutate accounting state.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void copyReference()}
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
          >
            Copy reference
          </button>
        </div>
      </div>
    </div>
  )
}
