"use client"

import { useState } from "react"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"
import {
  themeBannerWarning,
  themeBtnSecondary,
  themeDialog,
  themeDialogOverlay,
  themeInput,
  themeLabel,
  themeTextPrimary,
  themeTextSecondary,
} from "@/lib/finance-ui/finance-visual-classes"

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
    <div className={themeDialogOverlay} role="presentation" onClick={onClose}>
      <div
        className={themeDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hard-reopen-request-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="hard-reopen-request-title"
          className={`text-lg font-semibold ${themeTextPrimary}`}
        >
          Request hard reopen
        </h2>
        <p className={`mt-2 text-sm ${themeTextSecondary}`}>
          Period {period.periodKey} · Branch {period.branchId}
        </p>
        <p className={`mt-4 text-sm ${themeTextSecondary}`}>
          Submit a reopen request for HO_ADMIN approval. If approved, the period moves from
          HARD_CLOSED to SOFT_CLOSED. Posting remains blocked until a separate soft reopen to
          OPEN.
        </p>
        <label className="mt-4 block">
          <span className={themeLabel}>Reason (required)</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={submitting}
            rows={3}
            className={`${themeInput} text-sm`}
            placeholder="Document why this hard-closed period should be reopened"
          />
        </label>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={themeBtnSecondary}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => void onConfirm(trimmedReason)}
            className={`${themeBannerWarning} px-4 py-2 font-medium disabled:cursor-not-allowed`}
          >
            {submitting ? "Submitting…" : "Submit reopen request"}
          </button>
        </div>
      </div>
    </div>
  )
}
