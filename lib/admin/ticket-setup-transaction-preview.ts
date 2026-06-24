import type { ThermalDocumentType } from "@/lib/thermal/types"

export type TicketSetupTransactionPreview = {
  refDocumentNo: string
  dateLine: string
  staffLabel: string
  staffValue: string
}

const SAMPLE_DATE = "21/06/2026 17:30"
const SAMPLE_STAFF = "103 • Somsak"

export function buildTicketSetupTransactionPreview(
  documentType: ThermalDocumentType,
  branchCode: string
): TicketSetupTransactionPreview {
  const refByType: Record<ThermalDocumentType, string> = {
    RECEIPT: `REC-${branchCode}-202606-0001`,
    REFUND: `RF-${branchCode}-202606-0001`,
    COLLECTOR: `COL-${branchCode}-202606-0001`,
    REPAIR_TICKET: `RT-${branchCode}-202606-0001`,
    READ_Z: `READZ-${branchCode}-202606-0001`,
  }

  return {
    refDocumentNo: refByType[documentType],
    dateLine: SAMPLE_DATE,
    staffLabel: "Staff",
    staffValue: SAMPLE_STAFF,
  }
}
