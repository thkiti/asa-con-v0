import type { PrismaClient } from "@/generated/prisma/client"
import { CatalogImageError } from "./errors"
import { normalizeCatalogProductCode } from "./normalize-catalog-code"

export type CatalogMatchStatus = "MATCHED" | "UNMATCHED" | "INVALID"

export type CatalogProductMatchResult = {
  rawCode: string
  productCode: string | null
  status: CatalogMatchStatus
  productId: string | null
  errorCode?: string
}

type ProductLookupDb = Pick<PrismaClient, "product">

export async function matchCatalogProductCode(
  db: ProductLookupDb,
  rawCode: string
): Promise<CatalogProductMatchResult> {
  const trimmed = String(rawCode ?? "").trim()
  if (!trimmed) {
    return {
      rawCode: trimmed,
      productCode: null,
      status: "INVALID",
      productId: null,
      errorCode: "CATALOG_CODE_TOO_SHORT",
    }
  }

  let productCode: string
  try {
    productCode = normalizeCatalogProductCode(trimmed)
  } catch (err) {
    const code =
      err instanceof CatalogImageError ? err.code : "INVALID_CATALOG_CODE_LENGTH"
    return {
      rawCode: trimmed,
      productCode: null,
      status: "INVALID",
      productId: null,
      errorCode: code,
    }
  }

  const product = await db.product.findUnique({
    where: { code: productCode },
    select: { id: true },
  })

  if (!product) {
    return {
      rawCode: trimmed,
      productCode,
      status: "UNMATCHED",
      productId: null,
    }
  }

  return {
    rawCode: trimmed,
    productCode,
    status: "MATCHED",
    productId: product.id,
  }
}
