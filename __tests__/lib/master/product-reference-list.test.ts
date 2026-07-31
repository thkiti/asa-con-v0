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

  it("orders by numeric Hook when hookGroup is selected, not Product Code", async () => {
    const products = [
      {
        id: "p10",
        code: "100",
        name: "Ten",
        productType: ProductType.TRACKED,
        deleted: false,
      },
      {
        id: "p2",
        code: "200",
        name: "Two",
        productType: ProductType.TRACKED,
        deleted: false,
      },
      {
        id: "p1",
        code: "900",
        name: "One",
        productType: ProductType.TRACKED,
        deleted: false,
      },
    ]
    const refs = [
      {
        id: "r10",
        hookGroup: "C",
        hookNo: 10,
        supplierCode: "S",
        productCode: "100",
        productGroup: null,
        productId: "p10",
        deleted: false,
        product: products[0],
      },
      {
        id: "r2",
        hookGroup: "C",
        hookNo: 2,
        supplierCode: "S",
        productCode: "200",
        productGroup: null,
        productId: "p2",
        deleted: false,
        product: products[1],
      },
      {
        id: "r1",
        hookGroup: "C",
        hookNo: 1,
        supplierCode: "S",
        productCode: "900",
        productGroup: null,
        productId: "p1",
        deleted: false,
        product: products[2],
      },
    ]
    const db = {
      product: {
        findMany: jest.fn().mockResolvedValue(products),
      },
      referenceStock: {
        findMany: jest.fn().mockResolvedValue(refs),
      },
    }

    const byCode = await listProductReference(db, {
      mode: "active",
      productCode: "",
      productName: "",
      hookGroup: "",
      hookNo: "",
      supplierCode: "",
      productGroup: "",
      referenceStatus: "all",
    })
    expect(byCode.map((r) => r.productCode)).toEqual(["100", "200", "900"])

    const byHook = await listProductReference(db, {
      mode: "active",
      productCode: "",
      productName: "",
      hookGroup: "C",
      hookNo: "",
      supplierCode: "",
      productGroup: "",
      referenceStatus: "all",
    })
    expect(byHook.map((r) => `${r.hookGroup}.${r.hookNo}`)).toEqual([
      "C.1",
      "C.2",
      "C.10",
    ])
  })
})
