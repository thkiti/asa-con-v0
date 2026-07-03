import { advancePeriodKey } from "@/lib/finance/period-key"
import { FinancePostingError } from "@/lib/finance/posting-errors"

describe("advancePeriodKey", () => {
  it("advances within the same year", () => {
    expect(advancePeriodKey("2026-01")).toBe("2026-02")
    expect(advancePeriodKey("2026-11")).toBe("2026-12")
  })

  it("rolls over December to January of next year", () => {
    expect(advancePeriodKey("2026-12")).toBe("2027-01")
  })

  it("rejects invalid period keys", () => {
    expect(() => advancePeriodKey("2026-13")).toThrow(FinancePostingError)
    expect(() => advancePeriodKey("bad")).toThrow(FinancePostingError)
  })
})
