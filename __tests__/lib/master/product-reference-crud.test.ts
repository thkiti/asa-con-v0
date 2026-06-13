import { Prisma } from "@/generated/prisma/client"
import { ProductType } from "@/generated/prisma/client"
import { createProductWithReference } from "@/lib/master/create-product-with-reference"
import { createReferenceStock } from "@/lib/master/create-reference-stock"
import { deleteProduct } from "@/lib/master/delete-product"
import { restoreProduct } from "@/lib/master/restore-product"
import { deleteReferenceStock } from "@/lib/master/delete-reference-stock"
import { MasterDomainError } from "@/lib/master/errors"
import { parsePatchProductBody } from "@/lib/master/parse-product-mutation"
import { parseCreateReferenceStockBody } from "@/lib/master/parse-product-reference-mutation"
import { parseCreateProductWithReferenceBody } from "@/lib/master/parse-product-create-mutation"
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

describe("parseCreateProductWithReferenceBody", () => {
  it("parses create product with reference payload", () => {
    expect(
      parseCreateProductWithReferenceBody({
        productCode: "5101001",
        name: "New Product",
        productType: "TRACKED",
        hookGroup: "K",
        hookNo: 12,
        supplierCode: "K.144",
        productGroup: "5101900",
      })
    ).toMatchObject({
      productCode: "5101001",
      name: "New Product",
      hookGroup: "K",
      hookNo: 12,
    })
  })

  it("rejects invalid product code", () => {
    expect(() =>
      parseCreateProductWithReferenceBody({
        productCode: "abc",
        name: "X",
        productType: "TRACKED",
        hookGroup: "K",
        hookNo: 1,
        supplierCode: "K.1",
      })
    ).toThrow(expect.objectContaining({ code: "PRODUCT_CODE_INVALID" }))
  })
})

describe("createProductWithReference", () => {
  it("creates product and reference when product is new", async () => {
    const txProductCreate = jest.fn().mockResolvedValue({ id: "prod-new" })
    const txReferenceCreate = jest.fn().mockResolvedValue({
      ...referenceRow,
      id: "ref-new",
      productId: "prod-new",
      product: { ...product, id: "prod-new" },
    })

    const db = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          product: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: txProductCreate,
            update: jest.fn(),
          },
          referenceStock: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: txReferenceCreate,
            update: jest.fn(),
          },
        })
      ),
    }

    const item = await createProductWithReference(db, {
      productCode: "5101001",
      groupCode: 51,
      typeCode: 1,
      runningCode: 1,
      name: "New Product",
      productType: ProductType.TRACKED,
      hookGroup: "K",
      hookNo: 12,
      supplierCode: "K.144",
      productGroup: "5101900",
    })

    expect(txProductCreate).toHaveBeenCalled()
    expect(txReferenceCreate).toHaveBeenCalled()
    expect(item.hasReference).toBe(true)
  })

  it("updates existing product and creates reference", async () => {
    const txProductUpdate = jest.fn().mockResolvedValue({ id: product.id })
    const txReferenceCreate = jest.fn().mockResolvedValue(referenceRow)

    const db = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          product: {
            findUnique: jest.fn().mockResolvedValue({ id: product.id }),
            create: jest.fn(),
            update: txProductUpdate,
          },
          referenceStock: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: txReferenceCreate,
            update: jest.fn(),
          },
        })
      ),
    }

    await createProductWithReference(db, {
      productCode: product.code,
      groupCode: 51,
      typeCode: 1,
      runningCode: 1,
      name: "Updated Name",
      productType: ProductType.CONSUMABLE,
      hookGroup: "K",
      hookNo: 12,
      supplierCode: "K.144",
      productGroup: "5101900",
    })

    expect(txProductUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Updated Name", deleted: false }),
      })
    )
    expect(txReferenceCreate).toHaveBeenCalled()
  })

  it("blocks duplicate active reference hook", async () => {
    const db = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          product: {
            findUnique: jest.fn().mockResolvedValue({ id: product.id }),
            update: jest.fn().mockResolvedValue({ id: product.id }),
            create: jest.fn(),
          },
          referenceStock: {
            findUnique: jest.fn().mockResolvedValue({ id: "ref-1", deleted: false }),
            create: jest.fn(),
            update: jest.fn(),
          },
        })
      ),
    }

    await expect(
      createProductWithReference(db, {
        productCode: product.code,
        groupCode: 51,
        typeCode: 1,
        runningCode: 1,
        name: "Product",
        productType: ProductType.TRACKED,
        hookGroup: "K",
        hookNo: 12,
        supplierCode: "K.144",
        productGroup: null,
      })
    ).rejects.toMatchObject({ code: "HOOK_DUPLICATE" })
  })
})

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
  it("soft-deletes product and all references in one transaction", async () => {
    const txProductUpdate = jest.fn().mockResolvedValue({ ...product, deleted: true })
    const txReferenceUpdateMany = jest.fn().mockResolvedValue({ count: 2 })

    const db = {
      product: {
        findUnique: jest.fn().mockResolvedValue(product),
      },
      referenceStock: {},
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          product: { update: txProductUpdate },
          referenceStock: { updateMany: txReferenceUpdateMany },
        })
      ),
    }

    const item = await deleteProduct(db, product.id)

    expect(db.$transaction).toHaveBeenCalledTimes(1)
    expect(txProductUpdate).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { deleted: true },
      select: expect.any(Object),
    })
    expect(txReferenceUpdateMany).toHaveBeenCalledWith({
      where: { productId: product.id },
      data: { deleted: true },
    })
    expect(item.deleted).toBe(true)
    expect(item.hasReference).toBe(false)
  })

  it("cascades when active references exist", async () => {
    const txReferenceUpdateMany = jest.fn().mockResolvedValue({ count: 1 })
    const db = {
      product: {
        findUnique: jest.fn().mockResolvedValue(product),
      },
      referenceStock: {},
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          product: {
            update: jest.fn().mockResolvedValue({ ...product, deleted: true }),
          },
          referenceStock: { updateMany: txReferenceUpdateMany },
        })
      ),
    }

    const item = await deleteProduct(db, product.id)
    expect(item.deleted).toBe(true)
    expect(txReferenceUpdateMany).toHaveBeenCalled()
  })
})

describe("restoreProduct", () => {
  it("restores product only without touching referenceStock", async () => {
    const db = {
      product: {
        findUnique: jest.fn().mockResolvedValue({ ...product, deleted: true }),
        update: jest.fn().mockResolvedValue({ ...product, deleted: false }),
      },
    }

    const item = await restoreProduct(db, product.id)

    expect(item.deleted).toBe(false)
    expect(db).not.toHaveProperty("referenceStock")
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
