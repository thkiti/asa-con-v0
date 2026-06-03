import { getNextHookNo } from "@/lib/master/get-next-hook-no"
import { loadProductByCode } from "@/lib/master/load-product-by-code"

describe("getNextHookNo", () => {
  it("returns 1 when hook group empty", async () => {
    const db = { referenceStock: { findFirst: jest.fn() } }
    await expect(getNextHookNo(db, "")).resolves.toBe(1)
    expect(db.referenceStock.findFirst).not.toHaveBeenCalled()
  })

  it("returns max hookNo + 1 for group", async () => {
    const db = {
      referenceStock: {
        findFirst: jest.fn().mockResolvedValue({ hookNo: 12 }),
      },
    }
    await expect(getNextHookNo(db, "k")).resolves.toBe(13)
    expect(db.referenceStock.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { hookGroup: "K" },
        orderBy: { hookNo: "desc" },
      })
    )
  })
})

describe("loadProductByCode", () => {
  it("returns product when found", async () => {
    const db = {
      product: {
        findUnique: jest.fn().mockResolvedValue({ code: "0101900", name: "Group A" }),
      },
    }
    await expect(loadProductByCode(db, "0101900")).resolves.toEqual({
      code: "0101900",
      name: "Group A",
    })
  })

  it("throws PRODUCT_NOT_FOUND when missing", async () => {
    const db = { product: { findUnique: jest.fn().mockResolvedValue(null) } }
    await expect(loadProductByCode(db, "9999999")).rejects.toMatchObject({
      code: "PRODUCT_NOT_FOUND",
    })
  })
})
