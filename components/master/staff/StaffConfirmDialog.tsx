"use client"

import { ConfirmDialog } from "@/components/ui/ConfirmDialog"

type StaffConfirmDialogProps = {
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
export function StaffConfirmDialog(props: StaffConfirmDialogProps) {
  return <ConfirmDialog {...props} data-testid="staff-confirm-dialog" />
}
