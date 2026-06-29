"use client"

import {
  themeDialogLight,
  themeDialogLightBody,
  themeDialogLightBtnSecondary,
  themeDialogLightTitle,
  themeDialogOverlayCentered,
} from "@/lib/theme/theme-classes"

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
      className={themeDialogOverlayCentered}
      data-testid="pay-in-slip-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label="PAY-IN slip preview"
      onClick={onClose}
    >
      <div
        className={`${themeDialogLight} max-h-[90vh] max-w-3xl overflow-auto p-4`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className={themeDialogLightTitle}>
            PAY-IN Slip{collectNo ? ` — ${collectNo}` : ""}
          </h2>
          <button
            type="button"
            className={themeDialogLightBtnSecondary}
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
            className="mx-auto max-h-[70vh] w-auto rounded border border-[#d4d4d8]"
            data-testid="pay-in-slip-preview-image"
          />
        ) : (
          <p className={themeDialogLightBody}>No image available.</p>
        )}
      </div>
    </div>
  )
}
