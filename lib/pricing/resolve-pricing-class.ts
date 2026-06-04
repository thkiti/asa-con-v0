import { PricingClass, ProductType } from "@/generated/prisma/client"

export type ProductPricingClassInput = {
  productType: ProductType
  groupCode: number
}

/** Pricing class for HO→SHOP policy lookup — not the same as inventory ProductType. */
export function resolvePricingClass(product: ProductPricingClassInput): PricingClass {
  if (product.productType === ProductType.CONSUMABLE) {
    return PricingClass.CONSUMABLE
  }
  if (product.groupCode >= 90) {
    return PricingClass.MACHINERY
  }
  return PricingClass.MATERIAL
}
