import {
  PaymentEvidenceStatus,
  PaymentMethod,
} from "@/generated/prisma/client"
import { listPendingPaymentEvidence } from "@/lib/pos/list-pending-payment-evidence"

describe("listPendingPaymentEvidence", () => {
  const branchId = "branch-shop"

  it("returns pending bank-transfer receipts for the shop", async () => {
    const db = {
      paymentEvidence: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "ev-1",
            receipt: {
              receiptNo: "REC-SH001-202606-0001",
              issuedAt: new Date("2026-06-05T03:00:00.000Z"),
            },
            sale: {
              id: "sale-1",
              total: "250.00",
              staffId: "101",
            },
          },
        ]),
      },
      staff: {
        findMany: jest.fn().mockResolvedValue([{ staffId: "101", name: "Ann" }]),
      },
    } as never

    const result = await listPendingPaymentEvidence(db, { branchId })

    expect(result.count).toBe(1)
    expect(result.receipts[0]).toMatchObject({
      evidenceId: "ev-1",
      receiptNo: "REC-SH001-202606-0001",
      staff: "101-Ann",
      total: "250.00",
    })
    expect(db.paymentEvidence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId,
          status: PaymentEvidenceStatus.PENDING,
          payment: { method: PaymentMethod.BANK_TRANSFER },
        }),
      })
    )
  })

  it("rejects missing branchId", async () => {
    const db = {
      paymentEvidence: { findMany: jest.fn() },
      staff: { findMany: jest.fn() },
    } as never

    await expect(listPendingPaymentEvidence(db, { branchId: "" })).rejects.toMatchObject(
      { code: "INVALID_BRANCH" }
    )
  })
})
