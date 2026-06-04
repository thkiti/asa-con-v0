import type { PrismaClient } from "@/generated/prisma/client"
import { Prisma } from "@/generated/prisma/client"
import { PricingDomainError } from "./pricing-errors"
import { toSellingPriceRow } from "./mappers"
import type { ProductWithActiveSellingPrice, SellingPriceRow } from "./types"

export type SellingPricePrisma = Pick<
  PrismaClient,
  "sellingPrice" | "product" | "$transaction"
>

export async function getActiveSellingPrice(
  db: Pick<PrismaClient, "sellingPrice">,
  productId: string
): Promise<Prisma.Decimal | null> {
  const row = await db.sellingPrice.findFirst({
    where: { productId, effectiveTo: null },
    orderBy: { effectiveFrom: "desc" },
  })
  return row?.price ?? null
}

export async function listSellingPriceHistory(
  db: Pick<PrismaClient, "sellingPrice">,
  productId: string
): Promise<SellingPriceRow[]> {
  const rows = await db.sellingPrice.findMany({
    where: { productId },
    orderBy: { effectiveFrom: "desc" },
  })
  return rows.map(toSellingPriceRow)
}

export async function setSellingPrice(
  db: SellingPricePrisma,
  input: { productId: string; price: number }
): Promise<SellingPriceRow> {
  const product = await db.product.findFirst({
    where: { id: input.productId, deleted: false },
    select: { id: true },
  })
  if (!product) {
    throw new PricingDomainError("Product not found", "PRODUCT_NOT_FOUND", 404)
  }

  const now = new Date()
  const created = await db.$transaction(async (tx) => {
    await tx.sellingPrice.updateMany({
      where: { productId: input.productId, effectiveTo: null },
      data: { effectiveTo: now },
    })

    return tx.sellingPrice.create({
      data: {
        productId: input.productId,
        price: new Prisma.Decimal(input.price.toFixed(2)),
        effectiveFrom: now,
      },
    })
  })

  return toSellingPriceRow(created)
}

export async function listProductsWithActiveSellingPrice(
  db: SellingPricePrisma
): Promise<ProductWithActiveSellingPrice[]> {
  const [products, activePrices] = await Promise.all([
    db.product.findMany({
      where: { deleted: false },
      select: {
        id: true,
        code: true,
        name: true,
        productType: true,
      },
      orderBy: { code: "asc" },
    }),
    db.sellingPrice.findMany({
      where: { effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
    }),
  ])

  const priceByProduct = new Map<string, (typeof activePrices)[number]>()
  for (const row of activePrices) {
    if (!priceByProduct.has(row.productId)) {
      priceByProduct.set(row.productId, row)
    }
  }

  return products.map((p) => {
    const active = priceByProduct.get(p.id)
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      productType: p.productType,
      activePrice: active?.price.toString() ?? null,
      activePriceSince: active?.effectiveFrom.toISOString() ?? null,
    }
  })
}
