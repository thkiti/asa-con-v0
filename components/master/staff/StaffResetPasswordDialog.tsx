"use client"

import { useEffect, useState } from "react"
import { themeBtnPrimary, themeBtnSecondary, themeInput } from "@/lib/theme/theme-classes"

type StaffResetPasswordDialogProps = {
  open: boolean
  staffId: string
  submitting?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (password: string) => Promise<void>
}

export function StaffResetPasswordDialog({
  open,
  staffId,
  submitting = false,
  error,
  onClose,
  onConfirm,
}: StaffResetPasswordDialogProps) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")

  useEffect(() => {
    if (!open) return
    setPassword("")
    setConfirm("")
  }, [open, staffId])

  if (!open) return null

  const trimmed = password.trim()
  const matches = trimmed.length > 0 && trimmed === confirm.trim()
  const canSubmit = matches && trimmed.length >= 4 && !submitting

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-reset-password-title"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg">
        <h2 id="staff-reset-password-title" className="text-lg font-semibold">
          Reset password
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Set a new password for staff {staffId}. The hash is never shown after save.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm text-muted-foreground">New password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
              className={themeInput}
              autoComplete="new-password"
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted-foreground">Confirm password</span>
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              disabled={submitting}
              className={themeInput}
              autoComplete="new-password"
            />
          </label>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
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
            disabled={!canSubmit}
            onClick={() => void onConfirm(trimmed)}
            className={themeBtnPrimary}
          >
            {submitting ? "Saving…" : "Reset password"}
          </button>
        </div>
      </div>
    </div>
  )
}
