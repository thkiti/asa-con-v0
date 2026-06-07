import { CatalogImageError } from "./errors"
import {
  extractCatalogCodeBase,
  formatProductCodeFromBase,
} from "./normalize-catalog-code"

export type AssignedCatalogSlot = {
  sourceSlot: number
  productCode: string
  finalFileName: string
}

export function assignCatalogSlotProductCodes(
  startingProductId: string,
  slotCount: number
): AssignedCatalogSlot[] {
  if (!Number.isInteger(slotCount) || slotCount < 1) {
    throw new CatalogImageError(
      "slotCount must be at least 1",
      "VALIDATION_ERROR",
      400
    )
  }

  const initialBase = extractCatalogCodeBase(startingProductId)
  const baseNum = BigInt(initialBase)
  const baseWidth = initialBase.length

  return Array.from({ length: slotCount }, (_, index) => {
    const nextBaseNum = baseNum + BigInt(index)
    let nextBase = nextBaseNum.toString()
    if (nextBase.length < baseWidth) {
      nextBase = nextBase.padStart(baseWidth, "0")
    }
    const productCode = formatProductCodeFromBase(nextBase)
    return {
      sourceSlot: index + 1,
      productCode,
      finalFileName: `${productCode}.png`,
    }
  })
}
