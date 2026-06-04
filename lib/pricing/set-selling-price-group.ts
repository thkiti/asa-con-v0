import type { PrismaClient } from "@/generated/prisma/client"
import { PricingDomainError } from "./pricing-errors"
import {
  loadSellingPriceGroupPreview,
  membersMatchingOldPrice,
  pricesEqual,
} from "./reference-product-group"
import { getActiveSellingPrice, setSellingPrice } from "./selling-price"

export type SetSellingPriceGroupInput = {
  anchorProductId: string
  newPrice: number
  expectedOldPrice: number | null
}

export type SetSellingPriceGroupResult = {
  updatedCount: number
  updatedIds: string[]
  skipped: Array<{
    productId: string
    code: string
    name: string
    reason: string
  }>
}

export async function setSellingPriceGroup(
  db: Pick<PrismaClient, "product" | "referenceStock" | "sellingPrice" | "$transaction">,
  input: SetSellingPriceGroupInput
): Promise<SetSellingPriceGroupResult> {
  const preview = await loadSellingPriceGroupPreview(db, input.anchorProductId)
  if (!preview) {
    throw new PricingDomainError("Product not found", "PRODUCT_NOT_FOUND", 404)
  }

  if (!pricesEqual(preview.anchor.price, input.expectedOldPrice)) {
    throw new PricingDomainError(
      "Anchor price changed — refresh and try again",
      "ANCHOR_PRICE_CHANGED",
      409
    )
  }

  const eligible = membersMatchingOldPrice(preview.members, preview.anchor.price)
  const skipped: SetSellingPriceGroupResult["skipped"] = []
  const updatedIds: string[] = []

  for (const member of preview.members) {
    if (!eligible.some((e) => e.productId === member.productId)) {
      if (!pricesEqual(member.price, preview.anchor.price)) {
        skipped.push({
          productId: member.productId,
          code: member.code,
          name: member.name,
          reason: "price_changed",
        })
      }
    }
  }

  for (const member of eligible) {
    const current = await getActiveSellingPrice(db, member.productId)
    const currentNum = current != null ? Number(current.toString()) : null
    if (!pricesEqual(currentNum, input.expectedOldPrice)) {
      skipped.push({
        productId: member.productId,
        code: member.code,
        name: member.name,
        reason: "price_changed",
      })
      continue
    }

    await setSellingPrice(db, {
      productId: member.productId,
      price: input.newPrice,
    })
    updatedIds.push(member.productId)
  }

  return {
    updatedCount: updatedIds.length,
    updatedIds,
    skipped,
  }
}
