"use client"

import { ThermalSlipPre } from "@/components/thermal/ThermalSlipPre"
import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import { buildReceiptSlipText } from "@/lib/pos/receipt-slip-format"

type PosSaleReceiptSlipProps = {
  receipt: ReceiptPrintContext
}

export function PosSaleReceiptSlip({ receipt }: PosSaleReceiptSlipProps) {
  const text = buildReceiptSlipText(receipt)
  return <ThermalSlipPre text={text} ariaLabel="Receipt" />
}
