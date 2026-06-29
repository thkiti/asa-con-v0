import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { buildPosOriginShopPath } from "@/lib/finance/inquiry/pos-origin-shop-path"

describe("pos origin shop path", () => {
  it("builds REC inquiry URL with branchId for HO audit", () => {
    expect(
      buildPosOriginShopPath({
        refType: FINANCE_REF_TYPES.POS_SALE,
        refId: "sale-1",
        branchId: "branch-sh001",
      })
    ).toBe("/shop/receipt/sale-1?branchId=branch-sh001")
  })

  it("builds REF print URL with autoprint and branchId", () => {
    expect(
      buildPosOriginShopPath({
        refType: FINANCE_REF_TYPES.POS_REFUND,
        refId: "refund-1",
        branchId: "branch-sh001",
        autoprint: true,
      })
    ).toBe("/shop/refund-receipt/refund-1?branchId=branch-sh001&autoprint=1")
  })
})
