"use client"

import { ConfirmDialog } from "@/components/ui/ConfirmDialog"

type ProductReferenceConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  pending?: boolean
  error?: string | null
  destructive?: boolean
  overlayClassName?: string
  onClose: () => void
  onConfirm: () => void
}

/** Domain alias — chrome lives in shared ConfirmDialog. */
export function ProductReferenceConfirmDialog(props: ProductReferenceConfirmDialogProps) {
  return <ConfirmDialog {...props} data-testid="product-reference-confirm-dialog" />
}
