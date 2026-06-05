import type { CSSProperties } from "react"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { buildRefundSlipText } from "@/lib/pos/refund-slip-format"
import { RECEIPT_COLUMNS } from "@/lib/pos/receipt-slip-format"

type PosRefundReceiptSlipProps = {
  receipt: RefundReceiptPrintContext
}

export function PosRefundReceiptSlip({ receipt }: PosRefundReceiptSlipProps) {
  const text = buildRefundSlipText(receipt)

  const slipWidth = `${RECEIPT_COLUMNS}ch`

  return (
    <pre
      className="pos-receipt-slip whitespace-pre"
      style={
        {
          ["--receipt-slip-ch-width"]: slipWidth,
          width: slipWidth,
          maxWidth: slipWidth,
        } as CSSProperties
      }
      aria-label="Refund receipt"
    >
      {text}
    </pre>
  )
}
