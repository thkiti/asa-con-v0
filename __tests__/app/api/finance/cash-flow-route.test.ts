import { NextRequest } from "next/server"
import { GET } from "@/app/api/finance/reports/cash-flow/route"
import { getCashFlow } from "@/lib/finance/reports/cash-flow"
import { parseCashFlowFilter } from "@/lib/finance/reports/report-filter"
import { ReportError } from "@/lib/reporting/report-errors"

jest.mock("@/lib/finance/reports/report-session", () => ({
  resolveReportSessionLegalEntityCode: jest.fn().mockResolvedValue("AS"),
}))

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
  const legalEntityCode = "AS" as const

  it("requires branchId", () => {
    expect(() =>
      parseCashFlowFilter(params({ periodKey: "2026-05" }), legalEntityCode)
    ).toThrow(ReportError)
  })

  it("accepts period scope", () => {
    const filter = parseCashFlowFilter(
      params({ branchId: "branch-1", periodKey: "2026-05" }),
      legalEntityCode
    )
    expect(filter).toEqual({
      legalEntityCode: "AS",
      branchId: "branch-1",
      periodKey: "2026-05",
    })
  })

  it("accepts date range scope", () => {
    const filter = parseCashFlowFilter(
      params({ branchId: "branch-1", from: "2026-05-01", to: "2026-05-31" }),
      legalEntityCode
    )
    expect(filter).toEqual({
      legalEntityCode: "AS",
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
      filter: { legalEntityCode: "AS", branchId: "branch-1", periodKey: "2026-05" },
      period: { legalEntityCode: "AS", periodKey: "2026-05" },
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
      { legalEntityCode: "AS", branchId: "branch-1", periodKey: "2026-05" }
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
