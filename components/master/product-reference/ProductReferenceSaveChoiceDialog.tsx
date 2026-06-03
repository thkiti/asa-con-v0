"use client"

import { themeBtnPrimary, themeBtnSecondary } from "@/lib/theme/theme-classes"

type ProductReferenceSaveChoiceDialogProps = {
  open: boolean
  pending?: boolean
  onSaveProduct: () => void
  onSaveAll: () => void
  onCancel: () => void
}

export function ProductReferenceSaveChoiceDialog({
  open,
  pending = false,
  onSaveProduct,
  onSaveAll,
  onCancel,
}: ProductReferenceSaveChoiceDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-ref-save-choice-title"
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 text-card-foreground shadow-lg">
        <h3 id="product-ref-save-choice-title" className="text-sm font-semibold">
          Choose save action
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Save Product</span> updates product name
          and type only.
          <br />
          <span className="font-medium text-foreground">Save All</span> also saves the reference
          link fields.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onSaveProduct}
            className={themeBtnPrimary}
          >
            Save Product
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onSaveAll}
            className={themeBtnPrimary}
          >
            Save All
          </button>
          <button type="button" disabled={pending} onClick={onCancel} className={themeBtnSecondary}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
