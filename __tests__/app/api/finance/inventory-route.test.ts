import { NextRequest } from "next/server"
import { reconcileInventory } from "@/lib/finance/reconciliation"
import { GET } from "@/app/api/finance/reconciliation/inventory/route"

jest.mock("@/lib/finance/reconciliation", () => ({
  reconcileInventory: jest.fn(),
  reconcileSalesAndTender: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: { mocked: true },
}))

const mockReconcileInventory = reconcileInventory as jest.MockedFunction<
  typeof reconcileInventory
>

describe("GET finance/reconciliation/inventory", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("parses filter, calls kernel, and returns DTO", async () => {
    const dto = {
      filter: { branchId: "branch-1", from: "2026-05-01", to: "2026-05-31" },
      operationalTotalValue: "100.00",
      glInventoryBalance: "95.00",
      variances: [],
    }
    mockReconcileInventory.mockResolvedValue(dto)

    const req = new NextRequest(
      "http://localhost/api/finance/reconciliation/inventory?branchId=branch-1&from=2026-05-01&to=2026-05-31"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(dto)
    expect(mockReconcileInventory).toHaveBeenCalledWith(
      expect.objectContaining({ mocked: true }),
      { branchId: "branch-1", from: "2026-05-01", to: "2026-05-31" }
    )
  })
})
