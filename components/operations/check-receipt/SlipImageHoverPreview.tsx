"use client"

type SlipImageHoverPreviewProps = {
  imageUrl: string
  receiptNo: string
  top: number
  left: number
  maxWidth: number
  maxHeight: number
}

export function SlipImageHoverPreview({
  imageUrl,
  receiptNo,
  top,
  left,
  maxWidth,
  maxHeight,
}: SlipImageHoverPreviewProps) {
  return (
    <div
      className="pointer-events-none fixed z-[9999]"
      style={{ top, left }}
      data-testid="check-receipt-slip-preview"
      role="tooltip"
    >
      <div
        className="flex flex-col overflow-hidden rounded-xl border border-border bg-card p-3 shadow-2xl"
        style={{ maxWidth, maxHeight }}
      >
        <p className="mb-2 shrink-0 truncate text-center font-mono text-xs text-muted-foreground">
          {receiptNo}
        </p>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <img
            src={imageUrl}
            alt={`Bank transfer slip for ${receiptNo}`}
            className="max-h-full max-w-full object-contain"
            style={{ maxHeight: maxHeight - 40 }}
            loading="eager"
          />
        </div>
      </div>
    </div>
  )
}
