import { updateReceiptPrintSettings } from "@/lib/receipt-settings/update-settings"

describe("updateReceiptPrintSettings", () => {
  it("upserts singleton row", async () => {
    const upsert = jest.fn().mockResolvedValue({
      id: "default",
      companyDisplayName: "ASA SERVICES",
      footerLine1: "Line 1",
      footerLine2: null,
      footerLine3: null,
      footerLine4: null,
      footerLine5: null,
      showAbbreviatedTaxTitle: true,
      showVatIncludedMessage: false,
    })
    const thermalUpsert = jest.fn().mockResolvedValue({
      documentType: "RECEIPT",
      headerLine1: "ASA SERVICES",
      headerLine2: null,
      headerLine3: null,
      footerLine1: "Line 1",
      footerLine2: null,
      footerLine3: null,
      footerLine4: null,
      footerLine5: null,
      showAbbreviatedTaxTitle: true,
      showVatIncludedMessage: false,
    })

    const result = await updateReceiptPrintSettings(
      {
        receiptPrintSettings: { upsert },
        thermalDocumentLayout: { upsert: thermalUpsert },
      } as never,
      {
        companyDisplayName: "ASA SERVICES",
        footerLine1: "Line 1",
        footerLine2: null,
        footerLine3: null,
        footerLine4: null,
        footerLine5: null,
        showAbbreviatedTaxTitle: true,
        showVatIncludedMessage: false,
      }
    )

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "default" } })
    )
    expect(thermalUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { documentType: "RECEIPT" } })
    )
    expect(result.companyDisplayName).toBe("ASA SERVICES")
    expect(result.footerLine1).toBe("Line 1")
    expect(result.showVatIncludedMessage).toBe(false)
  })
})
