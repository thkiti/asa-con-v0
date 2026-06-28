"use client"

type PayInSlipPreviewModalProps = {
  open: boolean
  imageUrl: string | null
  collectNo?: string
  onClose: () => void
}

export function PayInSlipPreviewModal({
  open,
  imageUrl,
  collectNo,
  onClose,
}: PayInSlipPreviewModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      data-testid="pay-in-slip-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label="PAY-IN slip preview"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] max-w-3xl overflow-auto rounded-lg bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            PAY-IN Slip{collectNo ? ` — ${collectNo}` : ""}
          </h2>
          <button
            type="button"
            className="rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`PAY-IN slip for ${collectNo ?? "collector report"}`}
            className="mx-auto max-h-[70vh] w-auto rounded border border-zinc-200"
            data-testid="pay-in-slip-preview-image"
          />
        ) : (
          <p className="text-sm text-zinc-600">No slip image available.</p>
        )}
      </div>
    </div>
  )
}
