"use client"

type SlipImageHoverPreviewProps = {
  imageUrl: string
  receiptNo: string
}

export function SlipImageHoverPreview({
  imageUrl,
  receiptNo,
}: SlipImageHoverPreviewProps) {
  return (
    <div
      className="pointer-events-none fixed inset-y-0 right-0 z-[9999] flex items-center justify-end p-4"
      data-testid="check-receipt-slip-preview"
    >
      <div className="flex max-h-[85vh] max-w-[55vw] flex-col rounded-xl border border-border bg-card p-3 shadow-2xl">
        <p className="mb-2 shrink-0 truncate text-center font-mono text-xs text-muted-foreground">
          {receiptNo}
        </p>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <img
            src={imageUrl}
            alt={`Bank transfer slip for ${receiptNo}`}
            className="max-h-[calc(85vh-2.5rem)] max-w-full object-contain"
            loading="eager"
          />
        </div>
      </div>
    </div>
  )
}
