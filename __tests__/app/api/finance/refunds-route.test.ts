import { NextRequest } from "next/server"
import { reconcileRefunds } from "@/lib/finance/reconciliation"
import { GET } from "@/app/api/finance/reconciliation/refunds/route"

jest.mock("@/lib/finance/reconciliation", () => ({
  reconcileInventory: jest.fn(),
  reconcileSalesAndTender: jest.fn(),
  reconcileRefunds: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: { mocked: true },
}))

const mockReconcileRefunds = reconcileRefunds as jest.MockedFunction<
  typeof reconcileRefunds
>

describe("GET finance/reconciliation/refunds", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("parses filter, calls kernel, and returns DTO", async () => {
    const dto = {
      filter: { branchId: "branch-2" },
      operationalRefundTotal: "120.00",
      glRefundRevenueTotal: "120.00",
      paymentBreakdown: [],
      variances: [],
    }
    mockReconcileRefunds.mockResolvedValue(dto)

    const req = new NextRequest(
      "http://localhost/api/finance/reconciliation/refunds?branchId=branch-2"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(dto)
    expect(mockReconcileRefunds).toHaveBeenCalledWith(
      expect.objectContaining({ mocked: true }),
      { branchId: "branch-2" }
    )
  })
})
