import { PaymentMethod, Prisma, ProductType, SaleStatus } from "@/generated/prisma/client"
import { loadSaleReceiptForPrint } from "@/lib/pos/load-sale-receipt"
import { PosLookupError } from "@/lib/pos/pos-errors"

function makeDb(sale: unknown, staff: unknown = null) {
  return {
    sale: {
      findFirst: jest.fn().mockResolvedValue(sale),
    },
    staff: {
      findUnique: jest.fn().mockResolvedValue(staff),
    },
  }
}

describe("loadSaleReceiptForPrint", () => {
  const branchId = "branch-1"
  const saleId = "sale-1"

  it("returns receipt view with cashier id-name from staff master", async () => {
    const db = makeDb(
      {
        id: saleId,
        branchId,
        staffId: "103",
        total: new Prisma.Decimal("125.00"),
        status: SaleStatus.COMPLETED,
        branch: { code: "SH001", name: "Shop" },
        items: [
          {
            qty: 1,
            unitPrice: new Prisma.Decimal("125.00"),
            lineTotal: new Prisma.Decimal("125.00"),
            product: { code: "0101001", name: "Shoe size 42" },
          },
        ],
        payment: {
          method: PaymentMethod.CASH,
          amount: new Prisma.Decimal("125.00"),
          change: new Prisma.Decimal("0.00"),
        },
        receipt: {
          receiptNo: "REC-SH001-202606-0001",
          issuedAt: new Date("2026-01-15T10:00:00.000Z"),
        },
      },
      { name: "Somsak Kamnuch" }
    )

    const view = await loadSaleReceiptForPrint(db, { saleId, branchId })
    expect(view.receiptNo).toBe("REC-SH001-202606-0001")
    expect(view.cashierDisplay).toBe("103-Somsak Kamnuch")
    expect(db.staff.findUnique).toHaveBeenCalledWith({
      where: { staffId: "103" },
      select: { name: true },
    })
  })

  it("falls back to staff id when name not found", async () => {
    const db = makeDb(
      {
        id: saleId,
        branchId,
        staffId: "103",
        total: new Prisma.Decimal("10.00"),
        status: SaleStatus.COMPLETED,
        branch: { code: "SH001", name: "Shop" },
        items: [],
        payment: {
          method: PaymentMethod.CASH,
          amount: new Prisma.Decimal("10.00"),
          change: new Prisma.Decimal("0.00"),
        },
        receipt: {
          receiptNo: "REC-SH001-202606-0001",
          issuedAt: new Date("2026-01-15T10:00:00.000Z"),
        },
      },
      null
    )

    const view = await loadSaleReceiptForPrint(db, { saleId, branchId })
    expect(view.cashierDisplay).toBe("103")
  })

  it("rejects when sale is missing for branch", async () => {
    const db = makeDb(null)
    await expect(loadSaleReceiptForPrint(db, { saleId, branchId })).rejects.toMatchObject(
      { code: "SALE_NOT_FOUND" }
    )
    await expect(loadSaleReceiptForPrint(db, { saleId, branchId })).rejects.toBeInstanceOf(
      PosLookupError
    )
  })
})
