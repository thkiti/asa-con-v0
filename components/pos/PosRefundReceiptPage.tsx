"use client"

import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { POS_REFUND_RECEIPT_PRINT_SOURCE } from "@/lib/pos-ui/pos-thermal-ticket-print"
import { PosRefundReceiptSlip } from "./PosRefundReceiptSlip"
import { PosThermalTicketPrintPage } from "./PosThermalTicketPrintPage"

type PosRefundReceiptPageProps = {
  receipt: RefundReceiptPrintContext
  autoPrint?: boolean
}

export function PosRefundReceiptPage({ receipt, autoPrint }: PosRefundReceiptPageProps) {
  return (
    <PosThermalTicketPrintPage
      printSourceKind={POS_REFUND_RECEIPT_PRINT_SOURCE}
      autoPrint={autoPrint}
      printButtonLabel="Print refund receipt"
    >
      <PosRefundReceiptSlip receipt={receipt} framed />
    </PosThermalTicketPrintPage>
  )
}
