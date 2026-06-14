import { buildLegacyTransactionKey } from "@/lib/import/legacy-sales/transaction-key"

describe("legacy sales transaction key", () => {
  it("scopes S_TRANS by branch and date", () => {
    const branchA = buildLegacyTransactionKey({
      legacyBranchId: "006",
      legacyDate: "01/01/2026",
      legacyTransNo: "000125812",
    })
    const branchB = buildLegacyTransactionKey({
      legacyBranchId: "007",
      legacyDate: "01/01/2026",
      legacyTransNo: "000125812",
    })

    expect(branchA).not.toBe(branchB)
    expect(branchA).toBe("006|2026-01-01|000125812")
  })

  it("does not collide when same S_TRANS repeats on another date", () => {
    const dayOne = buildLegacyTransactionKey({
      legacyBranchId: "006",
      legacyDate: "01/01/2026",
      legacyTransNo: "000001",
    })
    const dayTwo = buildLegacyTransactionKey({
      legacyBranchId: "006",
      legacyDate: "02/01/2026",
      legacyTransNo: "000001",
    })

    expect(dayOne).not.toBe(dayTwo)
  })
})
