import { NextRequest } from "next/server"
import { GET } from "@/app/api/finance/reports/cash-flow/route"
import { getCashFlow } from "@/lib/finance/reports/cash-flow"
import { parseCashFlowFilter } from "@/lib/finance/reports/report-filter"
import { ReportError } from "@/lib/reporting/report-errors"

jest.mock("@/lib/finance/reports/cash-flow", () => ({
  getCashFlow: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: { mocked: true },
}))

const mockGetCashFlow = getCashFlow as jest.MockedFunction<typeof getCashFlow>

function params(input: Record<string, string>): { get: (name: string) => string | null } {
  return {
    get: (name: string) => input[name] ?? null,
  }
}

describe("parseCashFlowFilter", () => {
  it("requires branchId", () => {
    expect(() => parseCashFlowFilter(params({ periodKey: "2026-05" }))).toThrow(ReportError)
  })

  it("accepts period scope", () => {
    const filter = parseCashFlowFilter(params({ branchId: "branch-1", periodKey: "2026-05" }))
    expect(filter).toEqual({ branchId: "branch-1", periodKey: "2026-05" })
  })

  it("accepts date range scope", () => {
    const filter = parseCashFlowFilter(
      params({ branchId: "branch-1", from: "2026-05-01", to: "2026-05-31" })
    )
    expect(filter).toEqual({
      branchId: "branch-1",
      from: "2026-05-01",
      to: "2026-05-31",
    })
  })
})

describe("GET /api/finance/reports/cash-flow", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("parses filter, calls domain, and returns JSON", async () => {
    const dto = {
      filter: { branchId: "branch-1", periodKey: "2026-05" },
      period: { branchId: "branch-1", periodKey: "2026-05" },
      method: "INDIRECT" as const,
      sections: {
        operating: { lines: [], subtotal: "0" },
        investing: { lines: [], subtotal: "0" },
        financing: { lines: [], subtotal: "0" },
      },
      netChangeInCash: "0",
      netIncome: "0",
      cashReconciliation: {
        openingCashAndEquivalents: "0",
        closingCashAndEquivalents: "0",
        glChange: "0",
        computedChange: "0",
        difference: "0",
        isReconciled: true,
      },
      warnings: [],
    }
    mockGetCashFlow.mockResolvedValue(dto)

    const req = new NextRequest(
      "http://localhost/api/finance/reports/cash-flow?branchId=branch-1&periodKey=2026-05"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(dto)
    expect(mockGetCashFlow).toHaveBeenCalledWith(
      expect.objectContaining({ mocked: true }),
      { branchId: "branch-1", periodKey: "2026-05" }
    )
  })

  it("returns 400 for invalid filter", async () => {
    const req = new NextRequest(
      "http://localhost/api/finance/reports/cash-flow?branchId=branch-1&periodKey=bad"
    )
    const res = await GET(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "periodKey must be YYYY-MM",
      code: "INVALID_FILTER",
    })
    expect(mockGetCashFlow).not.toHaveBeenCalled()
  })
})
