"use client"

import { ThermalTicketSlipView } from "@/components/thermal/ThermalTicketSlipView"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { buildTicketLayout } from "@/lib/thermal/build-ticket-layout"
import { ReceiptLookupCopyWatermark } from "./ReceiptLookupCopyWatermark"

type PosRefundPrintPreviewProps = {
  receipt: RefundReceiptPrintContext
  /** Document Lookup only — marks preview as copy, not original print/PDF. */
  copyWatermark?: boolean
  testId?: string
  /** Tighter framing for embedded POS lookup panel. */
  compact?: boolean
}

/**
 * Framed refund ticket preview — same renderer as Refund print preview
 * (ThermalTicketSlipView + receipt-setup-preview framing).
 */
export function PosRefundPrintPreview({
  receipt,
  copyWatermark = false,
  testId = "refund-print-preview",
  compact = false,
}: PosRefundPrintPreviewProps) {
  const ticketLayout = buildTicketLayout({
    documentType: "REFUND",
    refund: receipt,
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
          testId="refund-print-preview-slip"
        />
      </div>
    </div>
  )
}
