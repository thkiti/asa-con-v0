import { NextRequest } from "next/server"
import { reconcileSalesAndTender } from "@/lib/finance/reconciliation"
import { GET } from "@/app/api/finance/reconciliation/sales/route"

jest.mock("@/lib/finance/reconciliation", () => ({
  reconcileInventory: jest.fn(),
  reconcileSalesAndTender: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: { mocked: true },
}))

const mockReconcileSales = reconcileSalesAndTender as jest.MockedFunction<
  typeof reconcileSalesAndTender
>

describe("GET finance/reconciliation/sales", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("parses filter, calls kernel, and returns DTO", async () => {
    const dto = {
      filter: { branchId: "branch-2" },
      operationalRevenue: "500.00",
      glRevenueBalance: "500.00",
      paymentBreakdown: [],
      variances: [],
    }
    mockReconcileSales.mockResolvedValue(dto)

    const req = new NextRequest(
      "http://localhost/api/finance/reconciliation/sales?branchId=branch-2"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(dto)
    expect(mockReconcileSales).toHaveBeenCalledWith(
      expect.objectContaining({ mocked: true }),
      { branchId: "branch-2" }
    )
  })
})
