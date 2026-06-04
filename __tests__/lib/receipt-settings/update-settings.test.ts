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

    const result = await updateReceiptPrintSettings(
      { receiptPrintSettings: { upsert } } as never,
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
    expect(result.companyDisplayName).toBe("ASA SERVICES")
    expect(result.footerLine1).toBe("Line 1")
    expect(result.showVatIncludedMessage).toBe(false)
  })
})
