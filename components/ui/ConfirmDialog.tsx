"use client"

import type { ReactNode } from "react"
import { ModalShell } from "@/components/ui/ModalShell"
import {
  themeBtnDanger,
  themeBtnPrimary,
  themeBtnSecondary,
} from "@/lib/theme/theme-classes"

export type ConfirmDialogProps = {
  open: boolean
  title: string
  /** Primary body copy. May include multiple paragraphs via ReactNode. */
  message: ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** Shows working state on confirm and disables actions. */
  pending?: boolean
  /** Label while pending (default "Working…"). */
  pendingLabel?: string
  /** Disable confirm without implying a pending network action. */
  disabled?: boolean
  error?: string | null
  /** Uses danger (destructive) confirm styling. */
  destructive?: boolean
  /** Soft warning styling on the confirm button (non-destructive caution). */
  warning?: boolean
  onClose: () => void
  onConfirm: () => void
  "data-testid"?: string
}

/**
 * Shared confirm dialog for simple yes/cancel workflows.
 * Domain hard-close / reopen dialogs with readiness UI stay separate.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  pending = false,
  pendingLabel = "Working…",
  disabled = false,
  error,
  destructive = false,
  warning = false,
  onClose,
  onConfirm,
  "data-testid": testId = "confirm-dialog",
}: ConfirmDialogProps) {
  const actionsDisabled = pending || disabled
  const confirmClass = destructive
    ? themeBtnDanger
    : warning
      ? `${themeBtnPrimary} bg-amber-600 hover:bg-amber-700`
      : themeBtnPrimary

  const handleClose = () => {
    if (pending) return
    onClose()
  }

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      title={title}
      titleId={`${testId}-title`}
      overlayAlign="center"
      closeOnOverlayClick={false}
      closeOnEscape={!pending}
      panelClassName="max-w-md p-6"
      data-testid={testId}
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            className={themeBtnSecondary}
            data-testid={`${testId}-cancel`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={actionsDisabled}
            className={confirmClass}
            data-testid={`${testId}-confirm`}
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </>
      }
    >
      {typeof message === "string" ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : (
        <div className="text-sm text-muted-foreground">{message}</div>
      )}
      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </ModalShell>
  )
}
