import {
  isOpeningBalancePeriodKey,
  OPENING_BALANCE_PERIOD_KEY,
} from "@/lib/finance/opening-balance-period"

describe("opening balance period", () => {
  it("defines the bootstrap period key", () => {
    expect(OPENING_BALANCE_PERIOD_KEY).toBe("2025-12")
  })

  it("detects the opening balance period key", () => {
    expect(isOpeningBalancePeriodKey("2025-12")).toBe(true)
    expect(isOpeningBalancePeriodKey("2026-01")).toBe(false)
    expect(isOpeningBalancePeriodKey(" 2025-12 ")).toBe(true)
  })
})
