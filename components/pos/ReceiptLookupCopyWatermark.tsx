"use client"

/** Diagonal COPY watermark — REC. LOOKUP on-screen preview only (not print/PDF). */
export function ReceiptLookupCopyWatermark() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
      data-testid="receipt-lookup-copy-watermark"
      aria-hidden
    >
      <div
        className="select-none text-center font-bold leading-tight text-zinc-900 opacity-[0.08]"
        style={{ transform: "rotate(-35deg)", fontSize: "2.75rem" }}
      >
        <div>สำเนา</div>
        <div>COPY</div>
      </div>
    </div>
  )
}
