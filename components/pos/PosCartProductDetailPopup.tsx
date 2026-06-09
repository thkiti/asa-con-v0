"use client"

import type { PosCartLine } from "@/lib/pos/cart"

type PosCartProductDetailPopupProps = {
  line: PosCartLine
  variant: "anchored" | "modal"
  anchorTop?: number
  onClose?: () => void
}

function PopupContent({ line }: { line: PosCartLine }) {
  return (
    <div
      className="flex w-52 flex-col gap-2 rounded-lg border border-zinc-300 bg-white p-2 text-zinc-900 shadow-lg"
      data-testid="pos-cart-product-detail-popup"
    >
      <div className="flex h-36 items-center justify-center rounded border border-zinc-200 bg-zinc-50 p-1">
        {line.catalogImageUrl ? (
          <img
            src={line.catalogImageUrl}
            alt={line.name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-center text-xs text-zinc-500">No image</span>
        )}
      </div>
      <div className="min-w-0 space-y-1">
        <div className="truncate text-sm font-semibold leading-snug">{line.name}</div>
        <div
          className="font-mono text-xs text-zinc-600"
          data-testid="pos-cart-product-detail-code"
        >
          {line.code}
        </div>
      </div>
    </div>
  )
}

export function PosCartProductDetailPopup({
  line,
  variant,
  anchorTop = 0,
  onClose,
}: PosCartProductDetailPopupProps) {
  if (variant === "modal") {
    return (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
        data-testid="pos-cart-detail-backdrop"
        onClick={() => onClose?.()}
        role="presentation"
      >
        <div
          className="max-w-sm"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-label={`Product details for ${line.name}`}
        >
          <PopupContent line={line} />
        </div>
      </div>
    )
  }

  return (
    <div
      className="pointer-events-none absolute z-[60]"
      style={{
        right: "calc(100% + 8px)",
        top: anchorTop,
      }}
    >
      <PopupContent line={line} />
    </div>
  )
}
