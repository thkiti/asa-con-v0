import {
  matchesAmountRange,
  matchesPdfStateFilter,
  resolvePostedVoucherPdfAvailable,
} from "@/lib/finance/inquiry/finance-document-inquiry-helpers"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"

describe("finance document inquiry helpers", () => {
  it("matches amount range inclusively", () => {
    expect(matchesAmountRange("1000", "500", "1500")).toBe(true)
    expect(matchesAmountRange("100", "500", "1500")).toBe(false)
    expect(matchesAmountRange("2000", "500", "1500")).toBe(false)
  })

  it("filters pdf state for archive-supported documents", () => {
    expect(matchesPdfStateFilter(true, "has")).toBe(true)
    expect(matchesPdfStateFilter(false, "missing")).toBe(true)
    expect(matchesPdfStateFilter(null, "has")).toBe(false)
    expect(matchesPdfStateFilter(true, "missing")).toBe(false)
  })

  it("resolves posted manual journal PDF availability", () => {
    expect(
      resolvePostedVoucherPdfAvailable({
        refType: FINANCE_REF_TYPES.MANUAL_JOURNAL,
        status: "POSTED",
        manualJournalEntry: {
          status: "POSTED",
          pdfPath: "manual-journal/test.pdf",
          pdfBlobUrl: null,
        },
      })
    ).toBe(true)

    expect(
      resolvePostedVoucherPdfAvailable({
        refType: FINANCE_REF_TYPES.POS_SALE,
        status: "POSTED",
        manualJournalEntry: null,
      })
    ).toBeNull()
  })
})
