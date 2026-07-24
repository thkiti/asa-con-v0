"use client"

import { ConfirmDialog } from "@/components/ui/ConfirmDialog"

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

/** Domain alias — chrome lives in shared ConfirmDialog. */
export function BankAccountConfirmDialog(props: BankAccountConfirmDialogProps) {
  return <ConfirmDialog {...props} data-testid="bank-account-confirm-dialog" />
}
