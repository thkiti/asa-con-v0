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
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {pending ? "กำลัง Apply…" : "ยืนยัน Apply"}
          </button>
        </div>
      </div>
    </div>
  )
}
