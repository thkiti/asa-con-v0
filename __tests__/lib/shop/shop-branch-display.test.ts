import {
  isNonProductionShopBranchCode,
  orderShopBranchesForDisplay,
  pickDefaultShopBranchId,
} from "@/lib/shop/shop-branch-display"

describe("shop-branch-display", () => {
  const branches = [
    { id: "p1c", code: "P1C01", name: "P1C Smoke" },
    { id: "sh2", code: "SH002", name: "Shop 2" },
    { id: "smoke", code: "SMOKE01", name: "Smoke Test" },
    { id: "sh1", code: "SH001", name: "Shop 1" },
  ]

  it("detects non-production branch codes", () => {
    expect(isNonProductionShopBranchCode("P1C01")).toBe(true)
    expect(isNonProductionShopBranchCode("SMOKE01")).toBe(true)
    expect(isNonProductionShopBranchCode("TEST99")).toBe(true)
    expect(isNonProductionShopBranchCode("DEMO01")).toBe(true)
    expect(isNonProductionShopBranchCode("SH001")).toBe(false)
  })

  it("orders real shop branches before smoke/test branches", () => {
    expect(orderShopBranchesForDisplay(branches).map((b) => b.code)).toEqual([
      "SH001",
      "SH002",
      "P1C01",
      "SMOKE01",
    ])
  })

  it("prefers the user's real shop branch when available", () => {
    expect(pickDefaultShopBranchId(branches, "sh2")).toBe("sh2")
  })

  it("skips smoke/test preferred branch and picks first real shop", () => {
    expect(pickDefaultShopBranchId(branches, "p1c")).toBe("sh1")
    expect(pickDefaultShopBranchId(branches, "smoke")).toBe("sh1")
  })

  it("falls back to first real shop when preferred branch is missing", () => {
    expect(pickDefaultShopBranchId(branches, "missing")).toBe("sh1")
  })
})
