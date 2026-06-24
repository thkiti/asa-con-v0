import { parseTicketSetupTextPreviewLines } from "@/lib/admin/ticket-setup-text-preview"

describe("parseTicketSetupTextPreviewLines", () => {
  it("classifies dashed dividers and amount rows", () => {
    const lines = parseTicketSetupTextPreviewLines(
      ["------------------------------", "TOTAL                    60.00", ""].join("\n")
    )
    expect(lines[0]).toEqual({ kind: "dashed-divider" })
    expect(lines[1]).toEqual({
      kind: "mono-amount",
      left: "TOTAL",
      right: "60.00",
    })
    expect(lines[2]).toEqual({ kind: "blank" })
  })

  it("classifies label-value rows for collector summary", () => {
    const lines = parseTicketSetupTextPreviewLines("Tickets                  2")
    expect(lines[0]).toEqual({
      kind: "mono-amount",
      left: "Tickets",
      right: "2",
    })
  })

  it("classifies dotted signature lines", () => {
    const lines = parseTicketSetupTextPreviewLines("..............................")
    expect(lines[0]).toEqual({ kind: "dotted-divider" })
  })
})

describe("buildRefundSetupPreviewBodyData", () => {
  it("keeps refund field values for structured preview", async () => {
    const { buildRefundSetupPreviewBodyData } = await import("@/lib/admin/refund-setup-preview")
    const body = buildRefundSetupPreviewBodyData({
      refundId: "preview",
      refundNo: "RF-SH001-202606-0001",
      issuedAt: "2026-06-04T12:30:00.000Z",
      kind: "SALE_LINKED",
      amount: "60.00",
      reason: "Sample reason",
      branchId: "b1",
      branchCode: "SH001",
      branchName: "Shop",
      branchAddress: null,
      branchPhone: null,
      companyDisplayName: null,
      companyTaxId: null,
      machineTaxId: null,
      cashierDisplay: "103-Somsak",
      saleId: "sale",
      originalReceiptId: "receipt",
      originalReceiptNo: "REC-SH001-202606-0001",
      thermalLayouts: {} as never,
      thermalLayout: {} as never,
    })

    expect(body.refundNo).toBe("RF-SH001-202606-0001")
    expect(body.originalReceiptNo).toBe("REC-SH001-202606-0001")
    expect(body.type).toBe("SALE LINKED")
    expect(body.reason).toBe("Sample reason")
    expect(body.amount).toBe("60.00")
  })
})
