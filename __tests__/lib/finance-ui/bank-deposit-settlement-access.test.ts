import { canAccessBankDepositSettlementUi } from "@/lib/finance-ui/bank-deposit-settlement"

describe("canAccessBankDepositSettlementUi", () => {
  it("allows HO_FINANCE and HO_ADMIN only", () => {
    expect(canAccessBankDepositSettlementUi("HO_FINANCE")).toBe(true)
    expect(canAccessBankDepositSettlementUi("HO_ADMIN")).toBe(true)
  })

  it("rejects shop staff and HO_OPERATIONS", () => {
    expect(canAccessBankDepositSettlementUi("SH_STAFF")).toBe(false)
    expect(canAccessBankDepositSettlementUi("HO_OPERATIONS")).toBe(false)
  })
})
