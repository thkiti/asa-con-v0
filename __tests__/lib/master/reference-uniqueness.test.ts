import { ProductType } from "@/generated/prisma/client"
import { createProductWithReference } from "@/lib/master/create-product-with-reference"
import { createReferenceStock } from "@/lib/master/create-reference-stock"
import { deleteProduct } from "@/lib/master/delete-product"
import { deleteReferenceStock } from "@/lib/master/delete-reference-stock"
import { updateReferenceStock } from "@/lib/master/update-reference-stock"
import {
  assertActiveHookAvailable,
  assertActiveSupplierAvailable,
  canonicalSupplierCode,
  isSharedSupplierPlaceholder,
} from "@/lib/master/reference-uniqueness"

const productA = {
  id: "prod-a",
  code: "0105006",
  name: "Product A",
  productType: ProductType.TRACKED,
  deleted: false,
}

const productB = {
  id: "prod-b",
  code: "0105007",
  name: "Product B",
  productType: ProductType.TRACKED,
  deleted: false,
}

describe("canonicalSupplierCode", () => {
  it("collapses punctuation and spacing variants", () => {
    expect(canonicalSupplierCode("K.338")).toBe("K338")
    expect(canonicalSupplierCode("K338")).toBe("K338")
    expect(canonicalSupplierCode("K. 338")).toBe("K338")
    expect(canonicalSupplierCode("k.338")).toBe("K338")
    expect(canonicalSupplierCode(" K.338 ")).toBe("K338")
  })

  it("treats '-' as shared placeholder", () => {
    expect(isSharedSupplierPlaceholder("-")).toBe(true)
    expect(isSharedSupplierPlaceholder("K.338")).toBe(false)
  })
})

describe("assertActiveHookAvailable", () => {
  it("allows free hook", async () => {
    const db = {
      referenceStock: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn() },
    }
    await expect(
      assertActiveHookAvailable(db, {
        hookGroup: "K",
        hookNo: 165,
        productId: productB.id,
      })
    ).resolves.toBeUndefined()
  })

  it("blocks hook owned by another product", async () => {
    const db = {
      referenceStock: {
        findFirst: jest.fn().mockResolvedValue({
          id: "ref-a",
          productId: productA.id,
          product: { code: productA.code },
        }),
        findMany: jest.fn(),
      },
    }
    await expect(
      assertActiveHookAvailable(db, {
        hookGroup: "K",
        hookNo: 165,
        productId: productB.id,
      })
    ).rejects.toMatchObject({
      code: "HOOK_ALREADY_ASSIGNED",
      message: expect.stringContaining("0105006"),
    })
  })

  it("allows same reference id when updating own hook", async () => {
    const db = {
      referenceStock: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
      },
    }
    await expect(
      assertActiveHookAvailable(db, {
        hookGroup: "K",
        hookNo: 165,
        productId: productA.id,
        excludeReferenceId: "ref-a",
      })
    ).resolves.toBeUndefined()
    expect(db.referenceStock.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: "ref-a" },
          hookGroup: "K",
          hookNo: 165,
        }),
      })
    )
  })
})

describe("assertActiveSupplierAvailable", () => {
  it("allows unused supplier", async () => {
    const db = {
      referenceStock: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    }
    await expect(
      assertActiveSupplierAvailable(db, {
        supplierCode: "K.338",
        productId: productB.id,
      })
    ).resolves.toBeUndefined()
  })

  it("blocks supplier owned by another product including format variants", async () => {
    const db = {
      referenceStock: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          { supplierCode: "K.338", product: { code: productA.code } },
        ]),
      },
    }

    for (const variant of ["K.338", "K338", "K. 338", "k.338"]) {
      await expect(
        assertActiveSupplierAvailable(db, {
          supplierCode: variant,
          productId: productB.id,
        })
      ).rejects.toMatchObject({ code: "SUPPLIER_CODE_ALREADY_ASSIGNED" })
    }
  })

  it("exempts shared Group S placeholder", async () => {
    const findMany = jest.fn()
    const db = { referenceStock: { findFirst: jest.fn(), findMany } }
    await expect(
      assertActiveSupplierAvailable(db, {
        supplierCode: "-",
        productId: productB.id,
      })
    ).resolves.toBeUndefined()
    expect(findMany).not.toHaveBeenCalled()
  })
})

describe("createReferenceStock uniqueness", () => {
  function dbWithUniqueness(opts: {
    hookOwner?: { id: string; productId: string; code: string } | null
    supplierOwners?: Array<{ supplierCode: string; code: string }>
    existingRef?: { id: string; deleted: boolean } | null
  }) {
    return {
      product: { findUnique: jest.fn().mockResolvedValue(productB) },
      referenceStock: {
        findFirst: jest.fn().mockResolvedValue(
          opts.hookOwner
            ? {
                id: opts.hookOwner.id,
                productId: opts.hookOwner.productId,
                product: { code: opts.hookOwner.code },
              }
            : null
        ),
        findMany: jest.fn().mockResolvedValue(
          (opts.supplierOwners ?? []).map((row) => ({
            supplierCode: row.supplierCode,
            product: { code: row.code },
          }))
        ),
        findUnique: jest.fn().mockResolvedValue(opts.existingRef ?? null),
        create: jest.fn().mockResolvedValue({
          id: "ref-new",
          hookGroup: "K",
          hookNo: 165,
          supplierCode: "K.338",
          productCode: productB.code,
          productGroup: null,
          productId: productB.id,
          deleted: false,
          product: productB,
        }),
        delete: jest.fn(),
      },
    }
  }

  it("blocks Product B from creating K.165 owned by Product A", async () => {
    const db = dbWithUniqueness({
      hookOwner: { id: "ref-a", productId: productA.id, code: productA.code },
    })
    await expect(
      createReferenceStock(db, {
        productId: productB.id,
        hookGroup: "K",
        hookNo: 165,
        supplierCode: "K.999",
        productCode: productB.code,
        productGroup: null,
      })
    ).rejects.toMatchObject({ code: "HOOK_ALREADY_ASSIGNED" })
    expect(db.referenceStock.create).not.toHaveBeenCalled()
  })

  it("blocks Product B from using supplier owned by Product A", async () => {
    const db = dbWithUniqueness({
      supplierOwners: [{ supplierCode: "K.338", code: productA.code }],
    })
    await expect(
      createReferenceStock(db, {
        productId: productB.id,
        hookGroup: "K",
        hookNo: 200,
        supplierCode: "K338",
        productCode: productB.code,
        productGroup: null,
      })
    ).rejects.toMatchObject({ code: "SUPPLIER_CODE_ALREADY_ASSIGNED" })
  })

  it("allows create after prior owner hard-delete frees hook and supplier", async () => {
    const db = dbWithUniqueness({})
    await expect(
      createReferenceStock(db, {
        productId: productB.id,
        hookGroup: "K",
        hookNo: 165,
        supplierCode: "K.338",
        productCode: productB.code,
        productGroup: null,
      })
    ).resolves.toMatchObject({ hasReference: true, productId: productB.id })
  })
})

describe("updateReferenceStock uniqueness", () => {
  it("blocks moving a ref onto another product's hook", async () => {
    const db = {
      referenceStock: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: "ref-b", productId: productB.id })
          .mockResolvedValueOnce(null),
        findFirst: jest.fn().mockResolvedValue({
          id: "ref-a",
          productId: productA.id,
          product: { code: productA.code },
        }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
    }

    await expect(
      updateReferenceStock(db, "ref-b", {
        hookGroup: "K",
        hookNo: 165,
        supplierCode: "K.1",
        productCode: productB.code,
        productGroup: null,
      })
    ).rejects.toMatchObject({ code: "HOOK_ALREADY_ASSIGNED" })
    expect(db.referenceStock.update).not.toHaveBeenCalled()
  })

  it("allows same product to keep its own hook and supplier on update", async () => {
    const update = jest.fn().mockResolvedValue({
      id: "ref-a",
      hookGroup: "K",
      hookNo: 165,
      supplierCode: "K.338",
      productCode: productA.code,
      productGroup: null,
      productId: productA.id,
      deleted: false,
      product: productA,
    })
    const db = {
      referenceStock: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: "ref-a", productId: productA.id })
          .mockResolvedValueOnce({ id: "ref-a", deleted: false }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update,
      },
    }

    await expect(
      updateReferenceStock(db, "ref-a", {
        hookGroup: "K",
        hookNo: 165,
        supplierCode: "K.338",
        productCode: productA.code,
        productGroup: null,
      })
    ).resolves.toMatchObject({ hookNo: 165, supplierCode: "K.338" })
    expect(update).toHaveBeenCalled()
  })
})

describe("createProductWithReference uniqueness", () => {
  it("blocks create when hook already assigned to another product", async () => {
    const db = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          product: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: productB.id }),
            update: jest.fn(),
          },
          referenceStock: {
            findFirst: jest.fn().mockResolvedValue({
              id: "ref-a",
              productId: productA.id,
              product: { code: productA.code },
            }),
            findMany: jest.fn().mockResolvedValue([]),
            findUnique: jest.fn(),
            create: jest.fn(),
          },
        })
      ),
    }

    await expect(
      createProductWithReference(db, {
        productCode: productB.code,
        groupCode: 1,
        typeCode: 5,
        runningCode: 7,
        name: "B",
        productType: ProductType.TRACKED,
        hookGroup: "K",
        hookNo: 165,
        supplierCode: "K.1",
        productGroup: null,
      })
    ).rejects.toMatchObject({ code: "HOOK_ALREADY_ASSIGNED" })
  })
})

describe("lifecycle frees uniqueness slots", () => {
  it("hard-delete reference targets exact id only", async () => {
    const del = jest.fn().mockResolvedValue({ id: "ref-a" })
    const db = {
      referenceStock: {
        findUnique: jest.fn().mockResolvedValue({
          id: "ref-a",
          product: productA,
        }),
        delete: del,
      },
    }
    await deleteReferenceStock(db, "ref-a")
    expect(del).toHaveBeenCalledWith({ where: { id: "ref-a" } })
  })

  it("product trash hard-deletes all refs freeing hooks/suppliers", async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 2 })
    const db = {
      product: { findUnique: jest.fn().mockResolvedValue(productA) },
      referenceStock: {},
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          product: {
            update: jest.fn().mockResolvedValue({ ...productA, deleted: true }),
          },
          referenceStock: { deleteMany },
        })
      ),
    }
    await deleteProduct(db, productA.id)
    expect(deleteMany).toHaveBeenCalledWith({ where: { productId: productA.id } })
  })
})
