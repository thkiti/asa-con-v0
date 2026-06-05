import { Prisma, RefundKind } from "@/generated/prisma/client"
import { loadRefundReceiptForPrint } from "@/lib/pos/load-refund-receipt"
import { PosLookupError } from "@/lib/pos/pos-errors"

function makeDb(refund: unknown, staff: unknown = null) {
  return {
    refund: {
      findFirst: jest.fn().mockResolvedValue(refund),
    },
    staff: {
      findUnique: jest.fn().mockResolvedValue(staff),
    },
  }
}

describe("loadRefundReceiptForPrint", () => {
  const branchId = "branch-1"
  const refundId = "refund-1"

  it("loads SALE_LINKED refund with refundNo, amount, branch, staff, saleId, originalReceiptNo", async () => {
    const db = makeDb(
      {
        id: refundId,
        refundNo: "REF-SH001-202606-0001",
        kind: RefundKind.SALE_LINKED,
        saleId: "sale-1",
        branchId,
        staffId: "103",
        originalReceiptId: "rcpt-1",
        amount: new Prisma.Decimal("50.00"),
        reason: "Defective item",
        createdAt: new Date("2026-06-04T12:00:00.000Z"),
        branch: { code: "SH001", name: "Shop One" },
        originalReceipt: { id: "rcpt-1", receiptNo: "REC-SH001-202606-0001" },
      },
      { name: "Somsak Kamnuch" }
    )

    const view = await loadRefundReceiptForPrint(db, { refundId, branchId })

    expect(view.refundId).toBe(refundId)
    expect(view.refundNo).toBe("REF-SH001-202606-0001")
    expect(view.amount).toBe("50.00")
    expect(view.branchCode).toBe("SH001")
    expect(view.branchName).toBe("Shop One")
    expect(view.cashierDisplay).toBe("103-Somsak Kamnuch")
    expect(view.saleId).toBe("sale-1")
    expect(view.originalReceiptId).toBe("rcpt-1")
    expect(view.originalReceiptNo).toBe("REC-SH001-202606-0001")
    expect(view.kind).toBe(RefundKind.SALE_LINKED)
    expect(view.reason).toBe("Defective item")
    expect(db.staff.findUnique).toHaveBeenCalledWith({
      where: { staffId: "103" },
      select: { name: true },
    })
  })

  it("loads GOODWILL refund with no originalReceiptNo", async () => {
    const db = makeDb({
      id: refundId,
      refundNo: "REF-SH001-202606-0002",
      kind: RefundKind.GOODWILL,
      saleId: null,
      branchId,
      staffId: null,
      originalReceiptId: null,
      amount: new Prisma.Decimal("25.00"),
      reason: "Customer goodwill",
      createdAt: new Date("2026-06-04T12:00:00.000Z"),
      branch: { code: "SH001", name: "Shop One" },
      originalReceipt: null,
    })

    const view = await loadRefundReceiptForPrint(db, { refundId, branchId })

    expect(view.kind).toBe(RefundKind.GOODWILL)
    expect(view.saleId).toBeNull()
    expect(view.originalReceiptId).toBeNull()
    expect(view.originalReceiptNo).toBeNull()
    expect(view.reason).toBe("Customer goodwill")
    expect(view.amount).toBe("25.00")
  })

  it("rejects branch mismatch as not found", async () => {
    const db = makeDb(null)
    await expect(
      loadRefundReceiptForPrint(db, { refundId, branchId: "other-branch" })
    ).rejects.toMatchObject({ code: "REFUND_NOT_FOUND" })
    await expect(
      loadRefundReceiptForPrint(db, { refundId, branchId: "other-branch" })
    ).rejects.toBeInstanceOf(PosLookupError)
  })

  it("rejects missing refund as not found", async () => {
    const db = makeDb(null)
    await expect(loadRefundReceiptForPrint(db, { refundId, branchId })).rejects.toMatchObject(
      { code: "REFUND_NOT_FOUND" }
    )
  })

  it("rejects SALE_LINKED when original receipt cannot be resolved", async () => {
    const db = makeDb({
      id: refundId,
      refundNo: "REF-SH001-202606-0003",
      kind: RefundKind.SALE_LINKED,
      saleId: "sale-1",
      branchId,
      staffId: null,
      originalReceiptId: "rcpt-missing",
      amount: new Prisma.Decimal("10.00"),
      reason: null,
      createdAt: new Date("2026-06-04T12:00:00.000Z"),
      branch: { code: "SH001", name: "Shop One" },
      originalReceipt: null,
    })

    await expect(loadRefundReceiptForPrint(db, { refundId, branchId })).rejects.toMatchObject({
      code: "REFUND_ORIGINAL_RECEIPT_NOT_FOUND",
    })
  })
})
