import type { PrismaClient } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"

type ProductLookupDb = Pick<PrismaClient, "product">

export type ProductByCodeResult = {
  code: string
  name: string
}

export async function loadProductByCode(
  db: ProductLookupDb,
  code: string
): Promise<ProductByCodeResult> {
  const normalized = String(code || "").trim()
  if (!normalized) {
    throw new MasterDomainError("Product code is required", "VALIDATION_ERROR", 400)
  }

  const product = await db.product.findUnique({
    where: { code: normalized },
    select: { code: true, name: true },
  })

  if (!product) {
    throw new MasterDomainError("Product not found", "PRODUCT_NOT_FOUND", 404)
  }

  return product
}
