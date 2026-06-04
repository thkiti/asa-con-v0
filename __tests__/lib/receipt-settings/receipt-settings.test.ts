import { parseUpdateReceiptPrintSettingsBody } from "@/lib/receipt-settings/parse-mutation"
import { toReceiptPrintSettingsView } from "@/lib/receipt-settings/mapper"

describe("receipt settings", () => {
  it("parses update body with optional footer lines", () => {
    expect(
      parseUpdateReceiptPrintSettingsBody({
        companyDisplayName: " ASA SERVICES ",
        footerLine1: "Line one",
        footerLine2: "",
        showAbbreviatedTaxTitle: false,
        showVatIncludedMessage: true,
      })
    ).toEqual({
      companyDisplayName: "ASA SERVICES",
      footerLine1: "Line one",
      footerLine2: null,
      footerLine3: null,
      footerLine4: null,
      footerLine5: null,
      showAbbreviatedTaxTitle: false,
      showVatIncludedMessage: true,
    })
  })

  it("maps null row to defaults", () => {
    expect(toReceiptPrintSettingsView(null).showAbbreviatedTaxTitle).toBe(true)
  })
})
