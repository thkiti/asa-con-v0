import { LedgerSkipReason, ProductType } from "@/generated/prisma/client"
import {
  isSellableProductType,
  ledgerSkipReasonAtSale,
  participatesInLedgerAtSale,
} from "@/lib/products/product-type-rules"

describe("product-type-rules", () => {
  it("TRACKED participates in ledger at sale", () => {
    expect(participatesInLedgerAtSale(ProductType.TRACKED)).toBe(true)
    expect(ledgerSkipReasonAtSale(ProductType.TRACKED)).toBeNull()
  })

  it("CONSUMABLE skips ledger with explicit reason", () => {
    expect(participatesInLedgerAtSale(ProductType.CONSUMABLE)).toBe(false)
    expect(ledgerSkipReasonAtSale(ProductType.CONSUMABLE)).toBe(
      LedgerSkipReason.CONSUMABLE
    )
  })

  it("sellable types include TRACKED and CONSUMABLE", () => {
    expect(isSellableProductType(ProductType.TRACKED)).toBe(true)
    expect(isSellableProductType(ProductType.CONSUMABLE)).toBe(true)
  })
})