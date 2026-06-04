import type { CSSProperties } from "react"
import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import {
  buildReceiptSlipText,
  RECEIPT_COLUMNS,
} from "@/lib/pos/receipt-slip-format"

type PosSaleReceiptSlipProps = {
  receipt: ReceiptPrintContext
}

export function PosSaleReceiptSlip({ receipt }: PosSaleReceiptSlipProps) {
  const text = buildReceiptSlipText(receipt)

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
      aria-label="Receipt"
    >
      {text}
    </pre>
  )
}
