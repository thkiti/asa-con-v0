import { Prisma } from "@/generated/prisma/client"
import { ProductType } from "@/generated/prisma/client"
import { createReferenceStock } from "@/lib/master/create-reference-stock"
import { deleteProduct } from "@/lib/master/delete-product"
import { deleteReferenceStock } from "@/lib/master/delete-reference-stock"
import { MasterDomainError } from "@/lib/master/errors"
import { parsePatchProductBody } from "@/lib/master/parse-product-mutation"
import { parseCreateReferenceStockBody } from "@/lib/master/parse-product-reference-mutation"
import { updateProduct } from "@/lib/master/update-product"

const product = {
  id: "prod-1",
  code: "5101001",
  name: "Product One",
  productType: ProductType.TRACKED,
  deleted: false,
}

const referenceRow = {
  id: "ref-1",
  hookGroup: "K",
  hookNo: 12,
  supplierCode: "K.144",
  productCode: "5101001",
  productGroup: "5101900",
  productId: product.id,
  deleted: false,
  product,
}

describe("parseCreateReferenceStockBody", () => {
  it("parses create reference payload", () => {
    expect(
      parseCreateReferenceStockBody({
        productId: product.id,
        hookGroup: "k",
        hookNo: 12,
        supplierCode: "k.144",
        productCode: "5101001",
        productGroup: "5101900",
      })
    ).toMatchObject({
      productId: product.id,
      hookGroup: "K",
      hookNo: 12,
    })
  })
})

describe("parsePatchProductBody", () => {
  it("rejects immutable product code", () => {
    expect(() =>
      parsePatchProductBody({ code: "9999999", name: "X", productType: "TRACKED" })
    ).toThrow(expect.objectContaining({ code: "PRODUCT_CODE_IMMUTABLE" }))
  })
})

describe("createReferenceStock", () => {
  it("creates reference for existing product", async () => {
    const db = {
      product: {
        findUnique: jest.fn().mockResolvedValue(product),
      },
      referenceStock: {
        create: jest.fn().mockResolvedValue(referenceRow),
      },
    }

    const item = await createReferenceStock(db, {
      productId: product.id,
      hookGroup: "K",
      hookNo: 12,
      supplierCode: "K.144",
      productCode: "5101001",
      productGroup: "5101900",
    })

    expect(item.hasReference).toBe(true)
    expect(item.hookGroup).toBe("K")
  })

  it("blocks missing product", async () => {
    const db = {
      product: { findUnique: jest.fn().mockResolvedValue(null) },
      referenceStock: { create: jest.fn() },
    }

    await expect(
      createReferenceStock(db, {
        productId: "missing",
        hookGroup: "K",
        hookNo: 1,
        supplierCode: "K.1",
        productCode: "5101001",
        productGroup: null,
      })
    ).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" })
  })

  it("maps duplicate hook to HOOK_DUPLICATE", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "test",
    })
    const db = {
      product: { findUnique: jest.fn().mockResolvedValue(product) },
      referenceStock: { create: jest.fn().mockRejectedValue(err) },
    }

    await expect(
      createReferenceStock(db, {
        productId: product.id,
        hookGroup: "K",
        hookNo: 12,
        supplierCode: "K.144",
        productCode: "5101001",
        productGroup: null,
      })
    ).rejects.toMatchObject({ code: "HOOK_DUPLICATE" })
  })
})

describe("deleteReferenceStock", () => {
  it("soft deletes reference", async () => {
    const db = {
      referenceStock: {
        findUnique: jest.fn().mockResolvedValue({ id: "ref-1" }),
        update: jest.fn().mockResolvedValue({ ...referenceRow, deleted: true }),
      },
    }

    const item = await deleteReferenceStock(db, "ref-1")
    expect(item.deleted).toBe(true)
  })
})

describe("deleteProduct", () => {
  it("blocks delete when active references exist", async () => {
    const db = {
      product: {
        findUnique: jest.fn().mockResolvedValue(product),
        update: jest.fn(),
      },
      referenceStock: {
        count: jest.fn().mockResolvedValue(1),
      },
    }

    await expect(deleteProduct(db, product.id)).rejects.toMatchObject({
      code: "PRODUCT_HAS_ACTIVE_REFERENCE",
    })
    expect(db.product.update).not.toHaveBeenCalled()
  })

  it("allows delete when no active references", async () => {
    const db = {
      product: {
        findUnique: jest.fn().mockResolvedValue(product),
        update: jest.fn().mockResolvedValue({ ...product, deleted: true }),
      },
      referenceStock: {
        count: jest.fn().mockResolvedValue(0),
      },
    }

    const item = await deleteProduct(db, product.id)
    expect(item.deleted).toBe(true)
  })
})

describe("updateProduct", () => {
  it("updates name and product type", async () => {
    const db = {
      product: {
        findUnique: jest.fn().mockResolvedValue(product),
        update: jest
          .fn()
          .mockResolvedValue({ ...product, name: "Renamed", productType: ProductType.CONSUMABLE }),
      },
    }

    const item = await updateProduct(db, product.id, {
      name: "Renamed",
      productType: ProductType.CONSUMABLE,
    })

    expect(item.productName).toBe("Renamed")
    expect(item.productType).toBe("CONSUMABLE")
    expect(item).not.toHaveProperty("password")
  })
})
