import {
  friendlySalesTargetError,
  isTechnicalSalesTargetError,
} from "@/lib/shop-ui/sales-target-ui-errors"

describe("sales-target-ui-errors", () => {
  it("detects technical JavaScript errors", () => {
    expect(
      isTechnicalSalesTargetError(
        "Cannot read properties of undefined (reading 'findUnique')"
      )
    ).toBe(true)
  })

  it("returns friendly load message for technical errors", () => {
    expect(
      friendlySalesTargetError(
        "Cannot read properties of undefined (reading 'findUnique')",
        "load"
      )
    ).toBe("Unable to load sales target. Please reload.")
  })

  it("passes through user-friendly validation messages", () => {
    expect(
      friendlySalesTargetError("Monthly target must be a valid number", "save")
    ).toBe("Monthly target must be a valid number")
  })
})
