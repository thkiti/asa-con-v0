"use client"

import { ConfirmDialog } from "@/components/ui/ConfirmDialog"

type BranchConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  pending?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: () => void
}

/** Domain alias — chrome lives in shared ConfirmDialog. */
export function BranchConfirmDialog(props: BranchConfirmDialogProps) {
  return <ConfirmDialog {...props} data-testid="branch-confirm-dialog" />
}
