import {
  APPLY_CONFIRM_DETAIL,
  APPLY_CONFIRM_MESSAGE,
} from "@/lib/system-ui/import-entity-config"
import {
  importButtonPrimaryClass,
  importButtonSecondaryClass,
} from "@/lib/system-ui/import-button-styles"

type ApplyConfirmDialogProps = {
  open: boolean
  pending?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ApplyConfirmDialog({
  open,
  pending = false,
  onCancel,
  onConfirm,
}: ApplyConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-confirm-title"
    >
      <div className="w-full max-w-lg rounded border border-zinc-200 bg-white p-6 shadow-lg">
        <h2 id="apply-confirm-title" className="text-base font-semibold text-zinc-900">
          ยืนยัน Apply
        </h2>
        <p className="mt-3 text-sm text-zinc-700">{APPLY_CONFIRM_MESSAGE}</p>
        <p className="mt-2 text-sm text-zinc-600">{APPLY_CONFIRM_DETAIL}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className={importButtonSecondaryClass}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={importButtonPrimaryClass}
          >
            {pending ? "กำลัง Apply…" : "ยืนยัน Apply"}
          </button>
        </div>
      </div>
    </div>
  )
}
