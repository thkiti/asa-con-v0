import { listProductReference } from "@/lib/master/product-reference-list"
import { ProductType } from "@/lib/shared"

describe("listProductReference", () => {
  it("returns product without reference and applies referenceStatus none", async () => {
    const db = {
      product: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "p1",
            code: "5101001",
            name: "With Ref",
            productType: ProductType.TRACKED,
            deleted: false,
          },
          {
            id: "p2",
            code: "6101001",
            name: "Orphan",
            productType: ProductType.TRACKED,
            deleted: false,
          },
        ]),
      },
      referenceStock: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "ref1",
            hookGroup: "G",
            hookNo: 1,
            supplierCode: "S1",
            productCode: "5101001",
            productGroup: "5101900",
            productId: "p1",
            deleted: false,
            product: {
              id: "p1",
              code: "5101001",
              name: "With Ref",
              productType: ProductType.TRACKED,
              deleted: false,
            },
          },
        ]),
      },
    }

    const all = await listProductReference(db, {
      mode: "active",
      productCode: "",
      productName: "",
      hookGroup: "",
      hookNo: "",
      supplierCode: "",
      productGroup: "",
      referenceStatus: "all",
    })
    expect(all).toHaveLength(2)

    const none = await listProductReference(db, {
      mode: "active",
      productCode: "",
      productName: "",
      hookGroup: "",
      hookNo: "",
      supplierCode: "",
      productGroup: "",
      referenceStatus: "none",
    })
    expect(none).toHaveLength(1)
    expect(none[0]?.hasReference).toBe(false)
    expect(none[0]?.productCode).toBe("6101001")
  })
})
