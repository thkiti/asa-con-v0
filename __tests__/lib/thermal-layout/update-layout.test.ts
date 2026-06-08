import { updateThermalDocumentLayout } from "@/lib/thermal-layout/update-layout"

describe("updateThermalDocumentLayout", () => {
  it("upserts layout row and dual-writes RECEIPT to ReceiptPrintSettings", async () => {
    const thermalUpsert = jest.fn().mockResolvedValue({
      documentType: "RECEIPT",
      headerLine1: "ASA",
      headerLine2: null,
      headerLine3: null,
      footerLine1: "Thanks",
      footerLine2: null,
      footerLine3: null,
      footerLine4: null,
      footerLine5: null,
      showAbbreviatedTaxTitle: true,
      showVatIncludedMessage: true,
    })
    const receiptUpsert = jest.fn().mockResolvedValue({
      id: "default",
      companyDisplayName: "ASA",
      footerLine1: "Thanks",
      footerLine2: null,
      footerLine3: null,
      footerLine4: null,
      footerLine5: null,
      showAbbreviatedTaxTitle: true,
      showVatIncludedMessage: true,
    })

    const result = await updateThermalDocumentLayout(
      {
        thermalDocumentLayout: { upsert: thermalUpsert },
        receiptPrintSettings: { upsert: receiptUpsert },
      } as never,
      "RECEIPT",
      {
        headerLine1: "ASA",
        headerLine2: null,
        headerLine3: null,
        footerLine1: "Thanks",
        footerLine2: null,
        footerLine3: null,
        footerLine4: null,
        footerLine5: null,
        showAbbreviatedTaxTitle: true,
        showVatIncludedMessage: true,
      }
    )

    expect(result.headerLine1).toBe("ASA")
    expect(receiptUpsert).toHaveBeenCalled()
  })
})
