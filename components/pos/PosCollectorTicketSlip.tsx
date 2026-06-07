import type { CSSProperties } from "react"
import {
  buildCollectorTicketSlipText,
  COLLECTOR_TICKET_SIGNATURE_LINES,
} from "@/lib/pos-ui/build-collector-ticket-slip"
import { RECEIPT_COLUMNS } from "@/lib/pos/receipt-slip-format"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

type PosCollectorTicketSlipProps = {
  report: ReadReportPayload
}

export function PosCollectorTicketSlip({ report }: PosCollectorTicketSlipProps) {
  const slipText = buildCollectorTicketSlipText(report)
  const signatureText = COLLECTOR_TICKET_SIGNATURE_LINES.join("\n")
  const slipWidth = `${RECEIPT_COLUMNS}ch`
  const slipStyle = {
    ["--receipt-slip-ch-width"]: slipWidth,
    width: slipWidth,
    maxWidth: slipWidth,
  } as CSSProperties

  return (
    <div
      data-collector-ticket-print-source
      className="collector-ticket-print-area"
      style={slipStyle}
    >
      <pre className="pos-receipt-slip whitespace-pre" aria-label="Collector ticket">
        {slipText}
      </pre>
      <div
        data-testid="collector-ticket-signature-space"
        className="collector-ticket-signature-space"
        aria-hidden="true"
      />
      <pre className="pos-receipt-slip whitespace-pre">{signatureText}</pre>
    </div>
  )
}
