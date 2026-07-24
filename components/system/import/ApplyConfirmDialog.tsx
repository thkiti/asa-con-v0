"use client"

import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import {
  APPLY_CONFIRM_DETAIL,
  APPLY_CONFIRM_MESSAGE,
} from "@/lib/system-ui/import-entity-config"

type ApplyConfirmDialogProps = {
  open: boolean
  pending?: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** System import confirm — shared ConfirmDialog chrome with Thai copy. */
export function ApplyConfirmDialog({
  open,
  pending = false,
  onCancel,
  onConfirm,
}: ApplyConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title="ยืนยัน Apply"
      message={
        <>
          <p>{APPLY_CONFIRM_MESSAGE}</p>
          <p className="mt-2">{APPLY_CONFIRM_DETAIL}</p>
        </>
      }
      confirmLabel="ยืนยัน Apply"
      cancelLabel="ยกเลิก"
      pending={pending}
      pendingLabel="กำลัง Apply…"
      onClose={onCancel}
      onConfirm={onConfirm}
      data-testid="apply-confirm-dialog"
    />
  )
}
