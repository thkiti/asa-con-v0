"use client"

import { useEffect, useState } from "react"
import type { PosCartLine } from "@/lib/pos/cart"

const MODAL_AUTO_CLOSE_MS = 2000

type PosCartProductDetailPopupProps = {
  line: PosCartLine
  variant: "anchored" | "modal"
  anchorTop?: number
  onClose?: () => void
}

function PopupContent({
  line,
  variant,
}: {
  line: PosCartLine
  variant: "anchored" | "modal"
}) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [line.productId, line.catalogImageUrl])

  const showImage = Boolean(line.catalogImageUrl) && !imageFailed
  const isModal = variant === "modal"

  if (isModal) {
    return (
      <div
        className="w-fit max-w-[60vw] overflow-hidden rounded-lg border border-zinc-300 bg-white text-zinc-900 shadow-lg"
        data-testid="pos-cart-product-detail-popup"
        data-preview-size="fit-content"
      >
        {showImage ? (
          <img
            src={line.catalogImageUrl!}
            alt={line.name}
            className="block h-auto max-h-[80vh] w-auto max-w-[60vw] object-contain"
            data-testid="pos-cart-product-detail-image-frame"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className="flex min-h-36 min-w-52 items-center justify-center px-4 py-6"
            data-testid="pos-cart-product-detail-image-frame"
          >
            <span
              className="text-center text-xs text-zinc-500"
              data-testid="pos-cart-product-detail-no-image"
            >
              No image
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="w-52 rounded-lg border border-zinc-300 bg-white p-2 text-zinc-900 shadow-lg"
      data-testid="pos-cart-product-detail-popup"
      data-preview-size="default"
    >
      <div
        className="flex h-36 items-center justify-center rounded border border-zinc-200 bg-zinc-50 p-1"
        data-testid="pos-cart-product-detail-image-frame"
      >
        {showImage ? (
          <img
            src={line.catalogImageUrl!}
            alt={line.name}
            className="max-h-full max-w-full object-contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span
            className="text-center text-xs text-zinc-500"
            data-testid="pos-cart-product-detail-no-image"
          >
            No image
          </span>
        )}
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
  useEffect(() => {
    if (variant !== "modal" || !onClose) return
    const timerId = window.setTimeout(() => onClose(), MODAL_AUTO_CLOSE_MS)
    return () => window.clearTimeout(timerId)
  }, [variant, line.productId, onClose])

  if (variant === "modal") {
    return (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-2"
        data-testid="pos-cart-detail-backdrop"
        onClick={() => onClose?.()}
        role="presentation"
      >
        <div
          className="w-fit max-w-[60vw]"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-label="Product image preview"
        >
          <PopupContent line={line} variant="modal" />
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
      <PopupContent line={line} variant="anchored" />
    </div>
  )
}
