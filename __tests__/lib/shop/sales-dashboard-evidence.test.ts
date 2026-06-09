import { PaymentEvidenceStatus, PaymentMethod } from "@/generated/prisma/client"
import { getSalesDashboardDayDetail } from "@/lib/shop/sales-dashboard"

describe("getSalesDashboardDayDetail evidenceStatus", () => {
  const branchId = "branch-1"
  const dateKey = "2026-06-05"

  it("maps BANK_TRANSFER receipt list rows with evidence status", async () => {
    const db = {
      branch: {
        findUnique: jest.fn().mockResolvedValue({ code: "SH001" }),
        findMany: jest.fn().mockResolvedValue([
          { id: branchId, code: "SH001", name: "Shop 1" },
        ]),
      },
      sale: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "sale-cash",
            total: "100.00",
            createdAt: new Date("2026-06-05T10:00:00.000Z"),
            receipt: { receiptNo: "REC-SH001-202606-0001" },
            payment: { method: PaymentMethod.CASH, paymentEvidence: null },
          },
          {
            id: "sale-bank",
            total: "250.00",
            createdAt: new Date("2026-06-05T11:00:00.000Z"),
            receipt: { receiptNo: "REC-SH001-202606-0002" },
            payment: {
              method: PaymentMethod.BANK_TRANSFER,
              paymentEvidence: { status: PaymentEvidenceStatus.PENDING },
            },
          },
        ]),
      },
    } as never

    const detail = await getSalesDashboardDayDetail(db, { dateKey, branchId })

    expect(detail.mode).toBe("receipt-list")
    if (detail.mode !== "receipt-list") return

    expect(detail.receipts[0]?.evidenceStatus).toBeNull()
    expect(detail.receipts[1]?.evidenceStatus).toBe(PaymentEvidenceStatus.PENDING)
  })
})
