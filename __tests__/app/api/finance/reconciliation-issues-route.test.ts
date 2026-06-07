import { NextRequest } from "next/server"
import { buildReconciliationIssuesResult } from "@/app/api/finance/shared/reconciliation-issues-response"
import { GET } from "@/app/api/finance/reconciliation/issues/route"

jest.mock("@/app/api/finance/shared/reconciliation-issues-response", () => ({
  buildReconciliationIssuesResult: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: { mocked: true },
}))

const mockBuild = buildReconciliationIssuesResult as jest.MockedFunction<
  typeof buildReconciliationIssuesResult
>

describe("GET finance/reconciliation/issues", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns enriched issue rows as JSON", async () => {
    const dto = {
      filter: { branchId: "branch-1", from: "2026-05-01", to: "2026-05-31" },
      checkedSales: 2,
      checkedStockDocuments: 1,
      checkedRefunds: 0,
      issueCount: 1,
      issues: [
        {
          id: "SALE:sale-1:MISSING_VOUCHER",
          sourceType: "SALE",
          sourceId: "sale-1",
          documentRef: "sale-1",
          issueType: "MISSING_VOUCHER",
          severity: "ERROR",
          status: "MISSING_GL",
          message: "Completed sale has no posted finance voucher",
          expectedAmount: null,
          actualAmount: null,
          difference: null,
          vouchers: [],
          journalEntries: [],
          sourceCreatedAt: "2026-05-01T00:00:00.000Z",
          sourcePostedAt: null,
        },
      ],
    }
    mockBuild.mockResolvedValue(dto)

    const req = new NextRequest(
      "http://localhost/api/finance/reconciliation/issues?branchId=branch-1&from=2026-05-01&to=2026-05-31&domain=revenue&status=MISSING_GL"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(dto)
    expect(mockBuild).toHaveBeenCalledWith(
      expect.objectContaining({ mocked: true }),
      {
        branchId: "branch-1",
        from: "2026-05-01",
        to: "2026-05-31",
        domain: "revenue",
        status: "MISSING_GL",
      }
    )
  })

  it("supports sourceType and issueType filters", async () => {
    mockBuild.mockResolvedValue({
      filter: {},
      checkedSales: 0,
      checkedStockDocuments: 0,
      checkedRefunds: 0,
      issueCount: 0,
      issues: [],
    })

    const req = new NextRequest(
      "http://localhost/api/finance/reconciliation/issues?sourceType=SALE&issueType=TOTAL_MISMATCH"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(mockBuild).toHaveBeenCalledWith(expect.anything(), {
      sourceType: "SALE",
      issueType: "TOTAL_MISMATCH",
    })
  })

  it("has no mutation handlers", () => {
    const route = require("@/app/api/finance/reconciliation/issues/route") as Record<
      string,
      unknown
    >
    expect(route.POST).toBeUndefined()
    expect(route.PATCH).toBeUndefined()
    expect(route.PUT).toBeUndefined()
    expect(route.DELETE).toBeUndefined()
  })
})
