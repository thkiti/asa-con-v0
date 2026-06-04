import { PaymentMethod, ProductType } from "@/generated/prisma/client"
import { validateAndPrepareCheckout } from "@/lib/pos/validation"
import { mockResolvedRetailPrice } from "./helpers/mock-retail-price"

jest.mock("@/lib/pricing/resolve-pos-retail-price", () => ({
  resolvePosRetailPrice: jest.fn(),
}))

import { resolvePosRetailPrice } from "@/lib/pricing/resolve-pos-retail-price"

const resolveMock = resolvePosRetailPrice as jest.Mock

describe("validateAndPrepareCheckout", () => {
  const db = {
    branch: {
      findUnique: jest.fn().mockResolvedValue({
        id: "b1",
        deleted: false,
        isActive: true,
      }),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([
        { id: "p1", productType: ProductType.TRACKED, deleted: false },
      ]),
    },
    sellingPrice: {},
  }

  beforeEach(() => {
    resolveMock.mockReset()
    resolveMock.mockResolvedValue(mockResolvedRetailPrice(99))
  })

  it("resolves unit price on server and defaults CASH paid to total", async () => {
    const prepared = await validateAndPrepareCheckout(db, {
      branchId: "b1",
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 0,
      lines: [{ productId: "p1", qty: 2 }],
    })

    expect(prepared.lines[0].unitPrice.toNumber()).toBe(99)
    expect(prepared.total.toNumber()).toBe(198)
    expect(prepared.paidAmount.toNumber()).toBe(198)
    expect(prepared.change.toNumber()).toBe(0)
  })

  it("rejects NO_ACTIVE_PRICE", async () => {
    resolveMock.mockResolvedValue(null)
    await expect(
      validateAndPrepareCheckout(db, {
        branchId: "b1",
        paymentMethod: PaymentMethod.CASH,
        paidAmount: 0,
        lines: [{ productId: "p1", qty: 1 }],
      })
    ).rejects.toMatchObject({ code: "NO_ACTIVE_PRICE" })
  })
})
