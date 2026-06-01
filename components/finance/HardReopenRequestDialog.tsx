"use client"

import { useState } from "react"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"

type HardReopenRequestDialogProps = {
  period: AccountingPeriodRow
  open: boolean
  submitting?: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}

export function HardReopenRequestDialog({
  period,
  open,
  submitting = false,
  onClose,
  onConfirm,
}: HardReopenRequestDialogProps) {
  const [reason, setReason] = useState("")

  if (!open) {
    return null
  }

  const trimmedReason = reason.trim()
  const canConfirm = trimmedReason.length > 0 && !submitting

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
        aria-labelledby="hard-reopen-request-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="hard-reopen-request-title" className="text-lg font-semibold text-zinc-900">
          Request hard reopen
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Period {period.periodKey} · Branch {period.branchId}
        </p>
        <p className="mt-4 text-sm text-zinc-700">
          Submit a reopen request for HO_ADMIN approval. If approved, the period moves from
          HARD_CLOSED to SOFT_CLOSED. Posting remains blocked until a separate soft reopen to
          OPEN.
        </p>
        <label className="mt-4 block">
          <span className="text-sm text-zinc-600">Reason (required)</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={submitting}
            rows={3}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Document why this hard-closed period should be reopened"
          />
        </label>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => void onConfirm(trimmedReason)}
            className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit reopen request"}
          </button>
        </div>
      </div>
    </div>
  )
}
