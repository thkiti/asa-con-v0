import { ProductType } from "@/generated/prisma/client"
import { normalizePosinyProductCode } from "@/lib/import/validation/product-code"

export type LegacySalesImportProductSpec = {
  code: string
  name: string
  category: "Service" | "Misc" | "Promotion"
  productType: ProductType
}

/** Products added for legacy SAE.dbf import compatibility — not inventory-tracked. */
export const LEGACY_SALES_IMPORT_PRODUCTS: LegacySalesImportProductSpec[] = [
  {
    code: "0103005",
    name: "Misc count key / Legacy misc item",
    category: "Misc",
    productType: ProductType.CONSUMABLE,
  },
  {
    code: "7002015",
    name: "Promotion item",
    category: "Promotion",
    productType: ProductType.CONSUMABLE,
  },
  {
    code: "7003003",
    name: "Additional shoe services",
    category: "Service",
    productType: ProductType.CONSUMABLE,
  },
]

export function parseLegacySalesImportProductParts(code: string) {
  const parts = normalizePosinyProductCode(code)
  if (!parts) {
    throw new Error(`Invalid legacy product code: ${code}`)
  }
  return parts
}

export type LegacySalesImportProductUpsertResult = {
  code: string
  action: "created" | "updated" | "unchanged" | "dry-run"
  name: string
  productType: ProductType
  category: string
}

export type LegacySalesImportProductDb = {
  product: {
    findUnique: (args: {
      where: { code: string }
      select: { id: true; name: true; productType: true; deleted: true }
    }) => Promise<{
      id: string
      name: string
      productType: ProductType
      deleted: boolean
    } | null>
    create: (args: {
      data: {
        code: string
        groupCode: number
        typeCode: number
        runningCode: number
        name: string
        productType: ProductType
        deleted: boolean
      }
    }) => Promise<{ id: string }>
    update: (args: {
      where: { code: string }
      data: {
        name: string
        productType: ProductType
        deleted: boolean
      }
    }) => Promise<{ id: string }>
  }
}

export async function upsertLegacySalesImportProducts(
  db: LegacySalesImportProductDb,
  options: { apply: boolean }
): Promise<LegacySalesImportProductUpsertResult[]> {
  const results: LegacySalesImportProductUpsertResult[] = []

  for (const spec of LEGACY_SALES_IMPORT_PRODUCTS) {
    const parts = parseLegacySalesImportProductParts(spec.code)
    const existing = await db.product.findUnique({
      where: { code: spec.code },
      select: { id: true, name: true, productType: true, deleted: true },
    })

    if (!options.apply) {
      results.push({
        code: spec.code,
        action: "dry-run",
        name: spec.name,
        productType: spec.productType,
        category: spec.category,
      })
      continue
    }

    if (!existing) {
      await db.product.create({
        data: {
          code: parts.code,
          groupCode: parts.groupCode,
          typeCode: parts.typeCode,
          runningCode: parts.runningCode,
          name: spec.name,
          productType: spec.productType,
          deleted: false,
        },
      })
      results.push({
        code: spec.code,
        action: "created",
        name: spec.name,
        productType: spec.productType,
        category: spec.category,
      })
      continue
    }

    const unchanged =
      !existing.deleted &&
      existing.name === spec.name &&
      existing.productType === spec.productType

    if (unchanged) {
      results.push({
        code: spec.code,
        action: "unchanged",
        name: spec.name,
        productType: spec.productType,
        category: spec.category,
      })
      continue
    }

    await db.product.update({
      where: { code: spec.code },
      data: {
        name: spec.name,
        productType: spec.productType,
        deleted: false,
      },
    })
    results.push({
      code: spec.code,
      action: "updated",
      name: spec.name,
      productType: spec.productType,
      category: spec.category,
    })
  }

  return results
}

export function printLegacySalesImportProductResults(
  results: LegacySalesImportProductUpsertResult[],
  mode: "dry-run" | "apply"
): void {
  console.log(`\n=== Legacy sales import products (${mode}) ===`)
  for (const row of results) {
    console.log(
      `${row.code}\t${row.action}\t${row.category}\t${row.productType}\t${row.name}`
    )
  }
}
