import {
  financeAccountCode,
  financeNumber,
  financeTable,
  financeTableScroll,
  financeTextPrimary,
} from "@/lib/finance-ui/finance-visual-classes"

describe("finance visual standard classes", () => {
  it("exports stable class names for finance tables", () => {
    expect(financeTable).toBe("finance-table")
    expect(financeTableScroll).toContain("finance-table-scroll")
    expect(financeTextPrimary).toBe("finance-text-primary")
    expect(financeAccountCode).toContain("finance-account-code")
    expect(financeNumber).toContain("finance-number")
  })
})
