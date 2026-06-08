"use client"

import { ThermalSlipPre } from "@/components/thermal/ThermalSlipPre"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { buildRefundSlipText } from "@/lib/pos/refund-slip-format"

type PosRefundReceiptSlipProps = {
  receipt: RefundReceiptPrintContext
}

export function PosRefundReceiptSlip({ receipt }: PosRefundReceiptSlipProps) {
  const text = buildRefundSlipText(receipt)
  return <ThermalSlipPre text={text} ariaLabel="Refund receipt" />
}
