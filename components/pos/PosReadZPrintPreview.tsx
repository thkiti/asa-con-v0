"use client"

import { PosReadZSlip } from "@/components/pos/PosReadZSlip"
import { ReceiptLookupCopyWatermark } from "@/components/pos/ReceiptLookupCopyWatermark"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

type PosReadZPrintPreviewProps = {
  report: ReadReportPayload
  layout: ResolvedThermalLayout
  /** Document Lookup / historical review — marks preview as copy, not Today ticket. */
  copyWatermark?: boolean
  testId?: string
  compact?: boolean
}

/** Framed READ Z ticket preview — same DOM as thermal print clone. */
export function PosReadZPrintPreview({
  report,
  layout,
  copyWatermark = false,
  testId = "read-z-print-preview",
  compact = false,
}: PosReadZPrintPreviewProps) {
  return (
    <div
      className={
        compact
          ? "readZTicketPreview receipt-setup-read-z-preview flex h-full min-h-0 w-full flex-col overflow-hidden"
          : "receipt-setup-preview receipt-setup-read-z-preview flex h-full min-h-0 flex-col"
      }
      data-testid={testId}
    >
      <div className="relative h-full min-h-0 w-full max-w-full">
        {copyWatermark ? <ReceiptLookupCopyWatermark /> : null}
        <PosReadZSlip report={report} layout={layout} framed />
      </div>
    </div>
  )
}
