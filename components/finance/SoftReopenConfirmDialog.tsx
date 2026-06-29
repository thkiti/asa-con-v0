"use client"

import { useState } from "react"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"
import {
  themeBtnPrimary,
  themeBtnSecondary,
  themeDialog,
  themeDialogOverlay,
  themeInput,
  themeLabel,
  themeTextPrimary,
  themeTextSecondary,
} from "@/lib/finance-ui/finance-visual-classes"

type SoftReopenConfirmDialogProps = {
  period: AccountingPeriodRow
  open: boolean
  submitting?: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}

export function SoftReopenConfirmDialog({
  period,
  open,
  submitting = false,
  onClose,
  onConfirm,
}: SoftReopenConfirmDialogProps) {
  const [reason, setReason] = useState("")

  if (!open) {
    return null
  }

  const trimmedReason = reason.trim()
  const canConfirm = trimmedReason.length > 0 && !submitting

  return (
    <div
      className={themeDialogOverlay}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={themeDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="soft-reopen-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="soft-reopen-title" className={`text-lg font-semibold ${themeTextPrimary}`}>
          Confirm reopen to open
        </h2>
        <p className={`mt-2 text-sm ${themeTextSecondary}`}>
          Period {period.periodKey} · Branch {period.branchId}
        </p>
        <p className={`mt-4 text-sm ${themeTextSecondary}`}>
          Reopening to OPEN allows posting again through the normal posting kernel. A reason is
          required for audit.
        </p>
        <label className="mt-4 block">
          <span className={themeLabel}>Reason (required)</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={submitting}
            rows={3}
            className={`${themeInput} text-sm`}
            placeholder="Document why this period is being reopened for posting"
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
            className={themeBtnPrimary}
          >
            {submitting ? "Reopening…" : "Reopen to OPEN"}
          </button>
        </div>
      </div>
    </div>
  )
}
