"use client"

import { ThermalTicketSlipView } from "@/components/thermal/ThermalTicketSlipView"
import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import { buildTicketLayout } from "@/lib/thermal/build-ticket-layout"
import { ReceiptLookupCopyWatermark } from "./ReceiptLookupCopyWatermark"

type PosReceiptPrintPreviewProps = {
  receipt: ReceiptPrintContext
  /** REC. LOOKUP only — marks preview as copy, not original print/PDF. */
  copyWatermark?: boolean
  testId?: string
  /** Tighter framing for embedded POS lookup panel. */
  compact?: boolean
}

/**
 * Framed receipt preview — same renderer as Receipt Setup Print Preview
 * (ThermalTicketSlipView + receipt-setup-preview framing).
 */
export function PosReceiptPrintPreview({
  receipt,
  copyWatermark = false,
  testId = "receipt-print-preview",
  compact = false,
}: PosReceiptPrintPreviewProps) {
  const ticketLayout = buildTicketLayout({
    documentType: "RECEIPT",
    receipt,
    layout: receipt.thermalLayout,
  })

  return (
    <div
      className={compact ? "receipt-setup-preview !mt-0 !p-0" : "receipt-setup-preview"}
      data-testid={testId}
    >
      <div className="relative w-full max-w-full">
        {copyWatermark ? <ReceiptLookupCopyWatermark /> : null}
        <ThermalTicketSlipView
          layout={ticketLayout}
          framed
          testId="receipt-print-preview-slip"
        />
      </div>
    </div>
  )
}
