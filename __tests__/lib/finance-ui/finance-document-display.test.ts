import {
  buildFinanceDocumentIdentityRow2Slash,
  buildFinanceDocumentStickyIdentityLabel,
} from "@/lib/finance-ui/finance-document-display"

describe("buildFinanceDocumentIdentityRow2Slash", () => {
  it("formats entry date as DD/MM/YYYY in summary row", () => {
    expect(
      buildFinanceDocumentIdentityRow2Slash({
        documentNo: "MJV-260009",
        entryDate: "2026-01-31T00:00:00.000Z",
        status: "POSTED",
      })
    ).toBe("MJV-260009 • Entry Date: 31/01/2026 • Period: 2026-01 • Status: POSTED")
  })
})

describe("buildFinanceDocumentStickyIdentityLabel", () => {
  it("formats compact sticky identity with entity, document no, and status", () => {
    expect(
      buildFinanceDocumentStickyIdentityLabel({
        legalEntityCode: "AD",
        documentNo: "MJV-260001",
        status: "POSTED",
      })
    ).toBe("ASAD • MJV-260001 • POSTED")
  })
})
