import type { SaleReceiptView } from "@/lib/pos/load-sale-receipt"
import { buildReceiptSlipText } from "@/lib/pos/receipt-slip-format"

type PosSaleReceiptSlipProps = {
  receipt: SaleReceiptView
}

export function PosSaleReceiptSlip({ receipt }: PosSaleReceiptSlipProps) {
  const text = buildReceiptSlipText(receipt)

  return (
    <pre
      className="pos-receipt-slip mx-auto whitespace-pre font-mono text-[12px] leading-snug text-black"
      aria-label="Receipt"
    >
      {text}
    </pre>
  )
}
