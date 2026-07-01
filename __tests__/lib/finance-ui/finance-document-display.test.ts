import { buildFinanceDocumentIdentityRow2Slash } from "@/lib/finance-ui/finance-document-display"

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
