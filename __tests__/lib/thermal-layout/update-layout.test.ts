import { updateThermalDocumentLayout } from "@/lib/thermal-layout/update-layout"

describe("updateThermalDocumentLayout", () => {
  it("upserts layout row with block text and footer", async () => {
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
      headerBlockText: "ASA",
      headerFontSize: "12",
      headerBlockBold: true,
      subHeaderBlockText: null,
      subHeaderFontSize: "12",
      subHeaderBlockBold: false,
      footerBlockText: "Thanks",
      footerFontSize: "12",
      footerBlockBold: true,
      showAbbreviatedTaxTitle: true,
      showVatIncludedMessage: true,
    })

    const result = await updateThermalDocumentLayout(
      {
        thermalDocumentLayout: { upsert: thermalUpsert },
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
        headerBlockText: "ASA",
        headerFontSize: 12,
        headerBlockBold: true,
        subHeaderBlockText: null,
        subHeaderFontSize: 12,
        subHeaderBlockBold: false,
        footerBlockText: "Thanks",
        footerFontSize: 12,
        footerBlockBold: true,
        showAbbreviatedTaxTitle: true,
        showVatIncludedMessage: true,
      }
    )

    expect(result.headerLine1).toBe("ASA")
    expect(result.footerBlockText).toBe("Thanks")
    expect(thermalUpsert).toHaveBeenCalled()
  })
})
