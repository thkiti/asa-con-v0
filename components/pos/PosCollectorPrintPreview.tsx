"use client"

import { PosCollectorTicketSlip } from "@/components/pos/PosCollectorTicketSlip"
import { ReceiptLookupCopyWatermark } from "@/components/pos/ReceiptLookupCopyWatermark"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

type PosCollectorPrintPreviewProps = {
  report: ReadReportPayload
  layout: ResolvedThermalLayout
  /** Document Lookup only — marks preview as copy, not original print. */
  copyWatermark?: boolean
  testId?: string
  /** Tighter framing for embedded POS collector panel. */
  compact?: boolean
}

/**
 * Framed collector ticket preview — same renderer as Receipt/Refund lookup preview
 * (ThermalTicketSlipView + receipt-setup-preview framing).
 */
export function PosCollectorPrintPreview({
  report,
  layout,
  copyWatermark = false,
  testId = "collector-print-preview",
  compact = false,
}: PosCollectorPrintPreviewProps) {
  return (
    <div
      className={compact ? "receipt-setup-preview !mt-0 !p-0" : "receipt-setup-preview"}
      data-testid={testId}
    >
      <div className="relative w-full max-w-full">
        {copyWatermark ? <ReceiptLookupCopyWatermark /> : null}
        <PosCollectorTicketSlip report={report} layout={layout} framed />
      </div>
    </div>
  )
}
