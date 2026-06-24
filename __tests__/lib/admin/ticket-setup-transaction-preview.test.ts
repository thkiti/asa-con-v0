import { buildTicketSetupTransactionPreview } from "@/lib/admin/ticket-setup-transaction-preview"

describe("buildTicketSetupTransactionPreview", () => {
  const branchCode = "SH001"

  it("uses document-type-specific ref prefixes", () => {
    expect(buildTicketSetupTransactionPreview("RECEIPT", branchCode).refDocumentNo).toBe(
      "REC-SH001-202606-0001"
    )
    expect(buildTicketSetupTransactionPreview("REFUND", branchCode).refDocumentNo).toBe(
      "RF-SH001-202606-0001"
    )
    expect(buildTicketSetupTransactionPreview("COLLECTOR", branchCode).refDocumentNo).toBe(
      "COL-SH001-202606-0001"
    )
    expect(buildTicketSetupTransactionPreview("REPAIR_TICKET", branchCode).refDocumentNo).toBe(
      "RT-SH001-202606-0001"
    )
    expect(buildTicketSetupTransactionPreview("READ_Z", branchCode).refDocumentNo).toBe(
      "READZ-SH001-202606-0001"
    )
  })

  it("uses Staff left label and code • name on the right", () => {
    const preview = buildTicketSetupTransactionPreview("RECEIPT", branchCode)
    expect(preview.staffLabel).toBe("Staff")
    expect(preview.staffValue).toBe("103 • Somsak")
    expect(preview.dateLine).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })
})
