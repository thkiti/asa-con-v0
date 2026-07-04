"use client"

import { themeBtnPrimary, themeBtnSecondary } from "@/lib/theme/theme-classes"

type BankAccountConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  pending?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: () => void
}

export function BankAccountConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  pending = false,
  error,
  onClose,
  onConfirm,
}: BankAccountConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bank-account-confirm-title"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg">
        <h2 id="bank-account-confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className={themeBtnSecondary}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={themeBtnPrimary}
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
