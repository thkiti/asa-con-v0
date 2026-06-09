import {
  PaymentEvidenceStatus,
  PaymentMethod,
} from "@/generated/prisma/client"
import { listCheckReceiptRows } from "@/lib/operations/check-receipt"

describe("listCheckReceiptRows", () => {
  const branchId = "branch-1"

  it("maps receipt rows with payment labels and slip preview url", async () => {
    const db = {
      branch: {
        findMany: jest.fn().mockResolvedValue([
          { id: branchId, code: "SH001", name: "Shop 1" },
        ]),
      },
      sale: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "sale-cash",
            staffId: "101",
            total: "100.00",
            receipt: {
              receiptNo: "REC-SH001-202606-0001",
              issuedAt: new Date("2026-06-05T03:00:00.000Z"),
            },
            payment: {
              method: PaymentMethod.CASH,
              paymentEvidence: null,
            },
          },
          {
            id: "sale-bank-pending",
            staffId: "102",
            total: "200.00",
            receipt: {
              receiptNo: "REC-SH001-202606-0002",
              issuedAt: new Date("2026-06-05T04:00:00.000Z"),
            },
            payment: {
              method: PaymentMethod.BANK_TRANSFER,
              paymentEvidence: { status: PaymentEvidenceStatus.PENDING },
            },
          },
          {
            id: "sale-bank-uploaded",
            staffId: "103",
            total: "300.00",
            receipt: {
              receiptNo: "REC-SH001-202606-0003",
              issuedAt: new Date("2026-06-05T05:00:00.000Z"),
            },
            payment: {
              method: PaymentMethod.BANK_TRANSFER,
              paymentEvidence: {
                status: PaymentEvidenceStatus.UPLOADED,
                blobUrl: "https://blob.example/slip.jpg",
                blobPathname: "payment-slips/SH001/REC-SH001-202606-0003.jpg",
              },
            },
          },
        ]),
      },
      staff: {
        findMany: jest.fn().mockResolvedValue([
          { staffId: "101", name: "Ann" },
          { staffId: "102", name: "Bob" },
          { staffId: "103", name: "Cara" },
        ]),
      },
    } as never

    const result = await listCheckReceiptRows(db, {
      branchId,
      year: 2026,
      month: 6,
    })

    expect(result.branchCode).toBe("SH001")
    expect(result.receipts).toHaveLength(3)
    expect(result.receipts[0]).toMatchObject({
      receiptNo: "REC-SH001-202606-0001",
      staff: "101-Ann",
      paymentMethod: "CASH",
      slipImageUrl: null,
    })
    expect(result.receipts[1]).toMatchObject({
      receiptNo: "REC-SH001-202606-0002",
      paymentMethod: "BANK TRANSFER",
      slipImageUrl: null,
    })
    expect(result.receipts[2]).toMatchObject({
      receiptNo: "REC-SH001-202606-0003",
      paymentMethod: "BANK TRANSFER",
      slipImageUrl: "https://blob.example/slip.jpg",
    })
  })

  it("rejects unknown branch", async () => {
    const db = {
      branch: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      sale: { findMany: jest.fn() },
      staff: { findMany: jest.fn() },
    } as never

    await expect(
      listCheckReceiptRows(db, { branchId: "missing", year: 2026, month: 6 })
    ).rejects.toMatchObject({ code: "BRANCH_NOT_FOUND", httpStatus: 404 })
  })
})
