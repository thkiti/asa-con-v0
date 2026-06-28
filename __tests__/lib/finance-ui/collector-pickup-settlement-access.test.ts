import { canAccessCollectorPickupSettlementUi } from "@/lib/finance-ui/collector-pickup-settlement"

describe("canAccessCollectorPickupSettlementUi", () => {
  it("allows HO_FINANCE and HO_ADMIN only", () => {
    expect(canAccessCollectorPickupSettlementUi("HO_FINANCE")).toBe(true)
    expect(canAccessCollectorPickupSettlementUi("HO_ADMIN")).toBe(true)
  })

  it("rejects shop staff and HO_OPERATIONS", () => {
    expect(canAccessCollectorPickupSettlementUi("SH_STAFF")).toBe(false)
    expect(canAccessCollectorPickupSettlementUi("HO_OPERATIONS")).toBe(false)
  })
})
