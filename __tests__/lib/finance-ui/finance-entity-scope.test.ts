import {
  appendFinanceLegalEntityToApiUrl,
  appendFinanceLegalEntityToPath,
  readFinanceLegalEntityFromSearchParams,
} from "@/lib/finance-ui/finance-entity-scope"

describe("finance entity scope URL helpers", () => {
  it("reads legalEntityCode from search params", () => {
    const params = new URLSearchParams("legalEntityCode=AD&status=DRAFT")
    expect(readFinanceLegalEntityFromSearchParams(params)).toBe("AD")
  })

  it("appends legalEntityCode to finance paths", () => {
    expect(appendFinanceLegalEntityToPath("/finance/manual-journal-entries", "AS")).toBe(
      "/finance/manual-journal-entries?legalEntityCode=AS"
    )
  })

  it("preserves existing query params when appending entity", () => {
    expect(
      appendFinanceLegalEntityToPath(
        "/finance/vouchers?postingState=posted",
        "AD"
      )
    ).toBe("/finance/vouchers?postingState=posted&legalEntityCode=AD")
  })

  it("appends entity to API URLs", () => {
    expect(
      appendFinanceLegalEntityToApiUrl(
        "/api/finance/manual-journal-entries/entry-1",
        "AS"
      )
    ).toBe("/api/finance/manual-journal-entries/entry-1?legalEntityCode=AS")
  })

  it("post-save editor redirect preserves saved document entity", () => {
    expect(
      appendFinanceLegalEntityToPath("/finance/payment-vouchers/pav-1", "AD")
    ).toBe("/finance/payment-vouchers/pav-1?legalEntityCode=AD")
  })
})
