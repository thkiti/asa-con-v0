import { GlAccountType } from "@/generated/prisma/client"
import {
  expectedNormalBalance,
  parseNormalBalance,
  validateNormalBalanceForType,
} from "@/lib/finance/gl-account-normal-balance"

describe("gl-account-normal-balance", () => {
  it("maps asset and expense to DEBIT", () => {
    expect(expectedNormalBalance(GlAccountType.ASSET)).toBe("DEBIT")
    expect(expectedNormalBalance(GlAccountType.EXPENSE)).toBe("DEBIT")
  })

  it("maps liability equity revenue to CREDIT", () => {
    expect(expectedNormalBalance(GlAccountType.LIABILITY)).toBe("CREDIT")
    expect(expectedNormalBalance(GlAccountType.EQUITY)).toBe("CREDIT")
    expect(expectedNormalBalance(GlAccountType.REVENUE)).toBe("CREDIT")
  })

  it("parses normal balance", () => {
    expect(parseNormalBalance("debit")).toBe("DEBIT")
    expect(parseNormalBalance("CREDIT")).toBe("CREDIT")
    expect(parseNormalBalance("x")).toBeNull()
  })

  it("validates balance for type", () => {
    expect(validateNormalBalanceForType(GlAccountType.ASSET, "DEBIT")).toBe(true)
    expect(validateNormalBalanceForType(GlAccountType.ASSET, "CREDIT")).toBe(
      false
    )
  })
})
