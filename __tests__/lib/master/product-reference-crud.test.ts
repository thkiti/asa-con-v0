import { ProductType } from "@/generated/prisma/client"
import { createProductWithReference } from "@/lib/master/create-product-with-reference"
import { createReferenceStock } from "@/lib/master/create-reference-stock"
import { deleteProduct } from "@/lib/master/delete-product"
import { restoreProduct } from "@/lib/master/restore-product"
import { deleteReferenceStock } from "@/lib/master/delete-reference-stock"
import { updateReferenceStock } from "@/lib/master/update-reference-stock"
import { parsePatchProductBody } from "@/lib/master/parse-product-mutation"
import { parseCreateReferenceStockBody } from "@/lib/master/parse-product-reference-mutation"
import { parseCreateProductWithReferenceBody } from "@/lib/master/parse-product-create-mutation"
import { updateProduct } from "@/lib/master/update-product"
import { listProductReference } from "@/lib/master/product-reference-list"

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

  it("preserves internal 7-digit productCode and productGroup", () => {
    expect(
      parseCreateReferenceStockBody({
        productId: product.id,
        hookGroup: "K",
        hookNo: 1,
        supplierCode: "K.338",
        productCode: "0105006",
        productGroup: "0105901",
      })
    ).toMatchObject({
      productCode: "0105006",
      productGroup: "0105901",
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
        findUnique: jest.fn().mockResolvedValue(null),
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
    expect(db.referenceStock.create).toHaveBeenCalled()
  })

  it("preserves 7-digit internal productCode and productGroup on create", async () => {
    const create = jest.fn().mockResolvedValue({
      ...referenceRow,
      productCode: "0105006",
      productGroup: "0105901",
    })
    const db = {
      product: { findUnique: jest.fn().mockResolvedValue(product) },
      referenceStock: {
        findUnique: jest.fn().mockResolvedValue(null),
        create,
      },
    }

    await createReferenceStock(db, {
      productId: product.id,
      hookGroup: "K",
      hookNo: 1,
      supplierCode: "K.338",
      productCode: "0105006",
      productGroup: "0105901",
    })

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productCode: "0105006",
          productGroup: "0105901",
        }),
      })
    )
  })

  it("revives soft-deleted exact hook instead of creating duplicate", async () => {
    const update = jest.fn().mockResolvedValue({
      ...referenceRow,
      deleted: false,
      supplierCode: "K.999",
      productCode: "0105006",
      productGroup: "0105901",
    })
    const db = {
      product: { findUnique: jest.fn().mockResolvedValue(product) },
      referenceStock: {
        findUnique: jest.fn().mockResolvedValue({ id: "ref-1", deleted: true }),
        update,
        create: jest.fn(),
      },
    }

    const item = await createReferenceStock(db, {
      productId: product.id,
      hookGroup: "K",
      hookNo: 12,
      supplierCode: "K.999",
      productCode: "0105006",
      productGroup: "0105901",
    })

    expect(db.referenceStock.create).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ref-1" },
        data: expect.objectContaining({
          deleted: false,
          supplierCode: "K.999",
          productCode: "0105006",
          productGroup: "0105901",
        }),
      })
    )
    expect(item.hasReference).toBe(true)
    expect(item.deleted).toBe(false)
  })

  it("blocks missing product", async () => {
    const db = {
      product: { findUnique: jest.fn().mockResolvedValue(null) },
      referenceStock: { findUnique: jest.fn(), create: jest.fn() },
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

  it("blocks duplicate active hook with HOOK_DUPLICATE", async () => {
    const db = {
      product: { findUnique: jest.fn().mockResolvedValue(product) },
      referenceStock: {
        findUnique: jest.fn().mockResolvedValue({ id: "ref-1", deleted: false }),
        create: jest.fn(),
      },
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
    expect(db.referenceStock.create).not.toHaveBeenCalled()
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
  it("restores product and soft-deleted referenceStock rows", async () => {
    const txProductUpdate = jest.fn().mockResolvedValue({ ...product, deleted: false })
    const txRefUpdateMany = jest.fn().mockResolvedValue({ count: 1 })
    const txRefFindMany = jest.fn().mockResolvedValue([
      { ...referenceRow, deleted: false },
    ])

    const db = {
      product: {
        findUnique: jest.fn().mockResolvedValue({ ...product, deleted: true }),
      },
      referenceStock: {},
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          product: { update: txProductUpdate },
          referenceStock: {
            updateMany: txRefUpdateMany,
            findMany: txRefFindMany,
          },
        })
      ),
    }

    const item = await restoreProduct(db, product.id)

    expect(db.$transaction).toHaveBeenCalledTimes(1)
    expect(txProductUpdate).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { deleted: false },
      select: expect.any(Object),
    })
    expect(txRefUpdateMany).toHaveBeenCalledWith({
      where: { productId: product.id, deleted: true },
      data: { deleted: false },
    })
    expect(item.deleted).toBe(false)
    expect(item.hasReference).toBe(true)
    expect(item.hookGroup).toBe("K")
  })

  it("returns product without reference when none restored", async () => {
    const db = {
      product: {
        findUnique: jest.fn().mockResolvedValue({ ...product, deleted: true }),
      },
      referenceStock: {},
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          product: {
            update: jest.fn().mockResolvedValue({ ...product, deleted: false }),
          },
          referenceStock: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            findMany: jest.fn().mockResolvedValue([]),
          },
        })
      ),
    }

    const item = await restoreProduct(db, product.id)
    expect(item.hasReference).toBe(false)
    expect(item.deleted).toBe(false)
  })
})

describe("updateReferenceStock", () => {
  it("updates and preserves 7-digit productGroup", async () => {
    const update = jest.fn().mockResolvedValue({
      ...referenceRow,
      productGroup: "0105901",
      productCode: "0105006",
    })
    const db = {
      referenceStock: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: "ref-1", productId: product.id })
          .mockResolvedValueOnce(null),
        update,
      },
    }

    const item = await updateReferenceStock(db, "ref-1", {
      hookGroup: "K",
      hookNo: 12,
      supplierCode: "K.338",
      productCode: "0105006",
      productGroup: "0105901",
    })

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productCode: "0105006",
          productGroup: "0105901",
        }),
      })
    )
    expect(item.productGroup).toBe("0105901")
  })

  it("hard-deletes soft-deleted unique-key orphan then updates", async () => {
    const del = jest.fn().mockResolvedValue({ id: "orphan" })
    const update = jest.fn().mockResolvedValue({
      ...referenceRow,
      hookNo: 99,
    })
    const db = {
      referenceStock: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: "ref-1", productId: product.id })
          .mockResolvedValueOnce({ id: "orphan", deleted: true }),
        delete: del,
        update,
      },
    }

    await updateReferenceStock(db, "ref-1", {
      hookGroup: "K",
      hookNo: 99,
      supplierCode: "K.1",
      productCode: "0105006",
      productGroup: "0101900",
    })

    expect(del).toHaveBeenCalledWith({ where: { id: "orphan" } })
    expect(update).toHaveBeenCalled()
  })

  it("blocks active unique-key conflict", async () => {
    const db = {
      referenceStock: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: "ref-1", productId: product.id })
          .mockResolvedValueOnce({ id: "other", deleted: false }),
        update: jest.fn(),
      },
    }

    await expect(
      updateReferenceStock(db, "ref-1", {
        hookGroup: "K",
        hookNo: 99,
        supplierCode: "K.1",
        productCode: "0105006",
        productGroup: null,
      })
    ).rejects.toMatchObject({ code: "HOOK_DUPLICATE" })
  })
})

describe("listProductReference after restore visibility", () => {
  it("shows restored reference on active list", async () => {
    const db = {
      product: {
        findMany: jest.fn().mockResolvedValue([product]),
      },
      referenceStock: {
        findMany: jest.fn().mockResolvedValue([
          {
            ...referenceRow,
            deleted: false,
            product,
          },
        ]),
      },
    }

    const items = await listProductReference(db, {
      mode: "active",
      productCode: "",
      productName: "",
      hookGroup: "",
      hookNo: "",
      supplierCode: "",
      productGroup: "",
      referenceStatus: "all",
    })
    expect(items).toHaveLength(1)
    expect(items[0]?.hasReference).toBe(true)
    expect(items[0]?.hookNo).toBe(12)
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
