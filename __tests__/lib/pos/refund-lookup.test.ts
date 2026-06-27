import { searchRefundLookup } from "@/lib/pos/refund-lookup"

function makeDb(refunds: unknown[], staff: unknown[] = []) {
  return {
    refund: {
      findMany: jest.fn().mockResolvedValue(refunds),
    },
    staff: {
      findMany: jest.fn().mockResolvedValue(staff),
    },
    branch: {
      findUnique: jest.fn().mockResolvedValue({ taxId: "0123456789012" }),
    },
  }
}

const saleLinkedRefund = {
  id: "refund-1",
  refundNo: "REF-SH001-202606-0008",
  kind: "SALE_LINKED",
  amount: "290.00",
  reason: "Defective item",
  createdAt: new Date("2026-06-26T09:58:00.000Z"),
  branchId: "branch-1",
  staffId: "103",
  saleId: "sale-1",
  originalReceiptId: "receipt-1",
  branch: {
    code: "SH001",
    name: "Shop One",
    address: "123 Main St",
    phone: "02-111-2222",
    taxId: "MACHINE-001",
  },
  originalReceipt: { receiptNo: "REC-SH001-202606-0111" },
  sale: { total: "860.00" },
}

describe("searchRefundLookup", () => {
  it("returns branch-scoped refund rows with legacy archive status", async () => {
    const db = makeDb([saleLinkedRefund], [{ staffId: "103", name: "Somsak Kamnuch" }])

    const result = await searchRefundLookup(db as never, {
      branchId: "branch-1",
      refundNo: "REF-SH001-202606-0008",
    })

    expect(db.refund.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: "branch-1",
          refundNo: { contains: "REF-SH001-202606-0008", mode: "insensitive" },
        }),
      })
    )
    expect(result.refunds).toHaveLength(1)
    expect(result.refunds[0]).toMatchObject({
      refundNo: "REF-SH001-202606-0008",
      amount: "290.00",
      originalReceiptNo: "REC-SH001-202606-0111",
      originalReceiptTotal: "860.00",
      archiveStatus: "legacy",
      pdfUrl: null,
    })
  })

  it("returns empty list when branch id is missing", async () => {
    const db = makeDb([])
    const result = await searchRefundLookup(db as never, { branchId: "" })
    expect(result.refunds).toEqual([])
    expect(db.refund.findMany).not.toHaveBeenCalled()
  })
})
