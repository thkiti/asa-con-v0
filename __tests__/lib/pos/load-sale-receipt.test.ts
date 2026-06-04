import { PaymentMethod, Prisma, ProductType, SaleStatus } from "@/generated/prisma/client"
import { loadSaleReceiptForPrint } from "@/lib/pos/load-sale-receipt"
import { PosLookupError } from "@/lib/pos/pos-errors"

function makeDb(sale: unknown) {
  return {
    sale: {
      findFirst: jest.fn().mockResolvedValue(sale),
    },
  }
}

describe("loadSaleReceiptForPrint", () => {
  const branchId = "branch-1"
  const saleId = "sale-1"

  it("returns receipt view from persisted sale rows", async () => {
    const db = makeDb({
      id: saleId,
      branchId,
      staffId: "S001",
      total: new Prisma.Decimal("125.00"),
      status: SaleStatus.COMPLETED,
      branch: { code: "SH01", name: "Shop" },
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
        receiptNo: "R-branch-1-20260101-0001",
        issuedAt: new Date("2026-01-15T10:00:00.000Z"),
      },
    })

    const view = await loadSaleReceiptForPrint(db, { saleId, branchId })
    expect(view.receiptNo).toBe("R-branch-1-20260101-0001")
    expect(view.cashierStaffId).toBe("S001")
    expect(view.lines[0].unitPrice).toBe("125.00")
    expect(view.cashAmount).toBe("125.00")
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
