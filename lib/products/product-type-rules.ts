import { LedgerSkipReason, ProductType } from "@/generated/prisma/client"

/** TRACKED lines issue stock at POS sale. */
export function participatesInLedgerAtSale(productType: ProductType): boolean {
  return productType === ProductType.TRACKED
}

/** Explicit auditable skip reason when ledger is not called at sale. */
export function ledgerSkipReasonAtSale(
  productType: ProductType
): LedgerSkipReason | null {
  if (productType === ProductType.CONSUMABLE) {
    return LedgerSkipReason.CONSUMABLE
  }
  return null
}

export function isSellableProductType(productType: ProductType): boolean {
  return (
    productType === ProductType.TRACKED ||
    productType === ProductType.CONSUMABLE
  )
}

export function mutatesInventoryAtSale(productType: ProductType): boolean {
  return participatesInLedgerAtSale(productType)
}