import {
  LEGACY_SALES_IMPORT_PRODUCTS,
  parseLegacySalesImportProductParts,
  upsertLegacySalesImportProducts,
} from "@/lib/import/legacy-sales/legacy-import-products"
import { ProductType } from "@/generated/prisma/client"

describe("legacy sales import products", () => {
  it("defines three compatibility products as CONSUMABLE", () => {
    expect(LEGACY_SALES_IMPORT_PRODUCTS).toHaveLength(3)
    expect(LEGACY_SALES_IMPORT_PRODUCTS.map((p) => p.code)).toEqual([
      "0103005",
      "7002015",
      "7003003",
    ])
    for (const product of LEGACY_SALES_IMPORT_PRODUCTS) {
      expect(product.productType).toBe(ProductType.CONSUMABLE)
    }
  })

  it("parses legacy product code parts", () => {
    expect(parseLegacySalesImportProductParts("7003003")).toEqual({
      code: "7003003",
      groupCode: 70,
      typeCode: 3,
      runningCode: 3,
    })
  })

  it("creates missing products on apply", async () => {
    const store = new Map<
      string,
      { id: string; name: string; productType: ProductType; deleted: boolean }
    >()

    const db = {
      product: {
        findUnique: jest.fn(async ({ where }: { where: { code: string } }) => {
          const row = store.get(where.code)
          return row ? { id: row.id, ...row } : null
        }),
        create: jest.fn(
          async ({
            data,
          }: {
            data: {
              code: string
              groupCode: number
              typeCode: number
              runningCode: number
              name: string
              productType: ProductType
              deleted: boolean
            }
          }) => {
            store.set(data.code, {
              id: `id-${data.code}`,
              name: data.name,
              productType: data.productType,
              deleted: data.deleted,
            })
            return { id: `id-${data.code}` }
          }
        ),
        update: jest.fn(
          async ({
            where,
            data,
          }: {
            where: { code: string }
            data: { name: string; productType: ProductType; deleted: boolean }
          }) => {
            const row = store.get(where.code)
            if (!row) throw new Error("missing")
            store.set(where.code, { ...row, ...data })
            return { id: row.id }
          }
        ),
      },
    }

    const dry = await upsertLegacySalesImportProducts(db as never, { apply: false })
    expect(dry.every((row) => row.action === "dry-run")).toBe(true)
    expect(store.size).toBe(0)

    const applied = await upsertLegacySalesImportProducts(db as never, { apply: true })
    expect(applied.map((row) => row.action)).toEqual(["created", "created", "created"])
    expect(store.size).toBe(3)
  })
})
