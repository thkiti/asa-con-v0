import { POS_REFUND_RECEIPT_PRINT_SOURCE } from "@/lib/pos-ui/pos-thermal-ticket-print"
import {
  cleanupThermalClonePrint,
  printThermalSlipClone,
  thermalPrintSourceSelector,
} from "@/lib/thermal/print-dom"

/** Print on-screen POS refund ticket — clone DOM, no fetch, no recompute. */
export function printRefundTicket(): boolean {
  return printThermalSlipClone(thermalPrintSourceSelector(POS_REFUND_RECEIPT_PRINT_SOURCE))
}

export function cleanupRefundTicketPrint(): void {
  cleanupThermalClonePrint()
}
